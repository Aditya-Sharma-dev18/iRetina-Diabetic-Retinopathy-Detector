import os
import io
import cv2
import types
import base64
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image
from torchvision import models, transforms
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="iRetina Diagnostic Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "iRetina_densenet121_best.pth")

def load_trained_model():
    net = models.densenet121(weights=None)
    in_features = net.classifier.in_features
    net.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, 5)
    )

    def safe_forward(self, x):
        features = self.features(x)
        out = F.relu(features, inplace=False)
        out = F.adaptive_avg_pool2d(out, (1, 1))
        out = torch.flatten(out, 1)
        out = self.classifier(out)
        return out

    net.forward = types.MethodType(safe_forward, net)
    for m in net.modules():
        if isinstance(m, nn.ReLU):
            m.inplace = False

    if not os.path.exists(WEIGHTS_PATH):
        raise FileNotFoundError(f"Model file not found at {WEIGHTS_PATH}")

    state_dict = torch.load(WEIGHTS_PATH, map_location=DEVICE)
    net.load_state_dict(state_dict)
    net.to(DEVICE)
    net.eval()
    return net

print(f"Loading weights onto {DEVICE}...")
model = load_trained_model()
print("Model loaded successfully.")

class GradCAM:
    def __init__(self, target_model, target_layer):
        self.model = target_model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.hook = self.target_layer.register_forward_hook(self._forward_hook)

    def _forward_hook(self, module, input, output):
        self.activations = output
        output.register_hook(self._backward_hook)

    def _backward_hook(self, grad):
        self.gradients = grad

    def generate(self, tensor):
        self.model.eval()
        with torch.enable_grad():
            output = self.model(tensor)
            pred_class = torch.argmax(output, dim=1).item()
            prob = F.softmax(output, dim=1)[0, pred_class].item()
            
            self.model.zero_grad()
            output[0, pred_class].backward()

        gradients = self.gradients.cpu().data.numpy()[0]
        activations = self.activations.cpu().data.numpy()[0]
        weights = np.mean(gradients, axis=(1, 2))

        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (256, 256))
        cam_min, cam_max = cam.min(), cam.max()
        cam = (cam - cam_min) / (cam_max - cam_min) if (cam_max - cam_min) > 1e-8 else np.zeros_like(cam)
        self.hook.remove()
        return cam, pred_class, prob

REPORTS = {
    0: {
        "title": "Stage 0 - No Apparent Diabetic Retinopathy",
        "urgency": "LOW",
        "biomarkers": "No microaneurysms, hemorrhages, or exudates detected.",
        "rationale": "Retinal microvasculature intact with healthy foveal margins.",
        "action_plan": ["Schedule routine annual diabetic eye screening.", "Maintain target glycemic control (HbA1c < 7.0%)."]
    },
    1: {
        "title": "Stage 1 - Mild Non-Proliferative DR",
        "urgency": "LOW TO MODERATE",
        "biomarkers": "Isolated microaneurysms detected in focal regions.",
        "rationale": "Early focal pericyte loss causing minor capillary outpouching without edema.",
        "action_plan": ["Follow-up retinal screening within 6 to 9 months.", "Strict glycemic and lipid profile monitoring."]
    },
    2: {
        "title": "Stage 2 - Moderate Non-Proliferative DR",
        "urgency": "MODERATE",
        "biomarkers": "Multiple dot-blot hemorrhages and lipid exudates mapped.",
        "rationale": "Progressive capillary occlusion and endothelial leakage threatening central vision.",
        "action_plan": ["Refer to an ophthalmologist within 4 to 8 weeks for OCT assessment.", "Evaluate for diabetic macular edema (DME)."]
    },
    3: {
        "title": "Stage 3 - Severe Non-Proliferative DR",
        "urgency": "HIGH",
        "biomarkers": "Dense intraretinal hemorrhages and cotton-wool spots mapped.",
        "rationale": "Extensive retinal ischemia across multiple quadrants (>50% risk of proliferative progression).",
        "action_plan": ["Immediate retina specialist consultation within 1 to 2 weeks.", "Schedule baseline Fluorescein Angiography (FFA) and OCT."]
    },
    4: {
        "title": "Stage 4 - Proliferative Diabetic Retinopathy",
        "urgency": "CRITICAL",
        "biomarkers": "Vitreous hemorrhage clusters and neovascular proliferation.",
        "rationale": "High VEGF activity causing fragile vessel growth and vision-threatening vitreous bleed.",
        "action_plan": ["Emergency vitreoretinal consultation within 24 to 48 hours.", "Initiate Urgent Panretinal Photocoagulation (PRP) or Anti-VEGF injection therapy."]
    }
}

def process_retinal_image(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file provided.")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = gray > 7
    if mask.any():
        img = img[np.ix_(mask.any(1), mask.any(0))]

    img = cv2.resize(img, (256, 256))
    proc = cv2.addWeighted(img, 4, cv2.GaussianBlur(img, (0, 0), 25.6), -4, 128)
    proc_rgb = cv2.cvtColor(proc, cv2.COLOR_BGR2RGB)

    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    tensor = transform(Image.fromarray(proc_rgb)).unsqueeze(0).to(DEVICE)

    cam_engine = GradCAM(model, model.features.norm5)
    cam, pred_class, confidence = cam_engine.generate(tensor)

    boxed_img = proc_rgb.copy()
    valid_boxes = 0
    total_lesion_area = 0

    if pred_class > 0:
        cam_uint8 = np.uint8(255 * cam)
        dyn_thresh = max(170, int(0.72 * cam_uint8.max()))
        _, binary = cv2.threshold(cam_uint8, dyn_thresh, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        separated = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=2)
        contours, _ = cv2.findContours(separated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            if 60 < area < (0.35 * 256 * 256):
                x, y, w, h = cv2.boundingRect(c)
                x1, y1 = max(0, x - 3), max(0, y - 3)
                x2, y2 = min(255, x + w + 3), min(255, y + h + 3)
                cv2.rectangle(boxed_img, (x1, y1), (x2, y2), (255, 30, 30), 2)
                cv2.putText(boxed_img, f"Lesion {valid_boxes + 1}", (x1, max(12, y1 - 4)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 50, 50), 1, cv2.LINE_AA)
                valid_boxes += 1
                total_lesion_area += (x2 - x1) * (y2 - y1)

    _, buffer = cv2.imencode('.png', cv2.cvtColor(boxed_img, cv2.COLOR_RGB2BGR))
    annotated_b64 = base64.b64encode(buffer).decode('utf-8')

    report_meta = REPORTS[pred_class]
    area_pct = round((total_lesion_area / (256 * 256)) * 100, 2)

    return {
        "stage": pred_class,
        "stage_title": report_meta["title"],
        "confidence": round(confidence * 100, 2),
        "urgency": report_meta["urgency"],
        "lesion_count": valid_boxes,
        "lesion_area_percentage": area_pct,
        "biomarkers": report_meta["biomarkers"],
        "clinical_rationale": report_meta["rationale"],
        "action_plan": report_meta["action_plan"],
        "annotated_image_base64": f"data:image/png;base64,{annotated_b64}"
    }

@app.post("/api/v1/diagnose")
async def diagnose(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")
    try:
        contents = await file.read()
        diagnostic_payload = process_retinal_image(contents)
        return {"success": True, "data": diagnostic_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "online", "device": str(DEVICE), "model": "DenseNet121-APTOS"}