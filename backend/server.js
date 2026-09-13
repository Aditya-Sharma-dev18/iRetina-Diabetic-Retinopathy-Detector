const dns = require('dns');
// Force Google & Cloudflare Public DNS at process level
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const User = require('./models/User');
const Report = require('./models/Report');
const auth = require('./middleware/auth');
const { buildClinicalPdf } = require('./utils/pdfGenerator');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Atlas SRV connection with Google DNS resolver
const uri = process.env.MONGO_URI;
console.log('>>> Connecting to MongoDB Atlas...');

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 8000
})
  .then(() => console.log('>>> CONNECTED TO MONGODB ATLAS SUCCESSFULLY! <<<'))
  .catch(err => {
    console.error('>>> MONGODB CONNECTION FAILED! <<<');
    console.error('Reason:', err.message);
  });

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connecting or unreachable.' });
    }
    const { name, email, password, role, patientId, age, gender } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'patient',
      patientId: role === 'patient' ? (patientId || `PAT-${Date.now().toString().slice(-4)}`) : undefined,
      age,
      gender
    });

    await user.save();
    return res.status(201).json({ success: true, message: 'Registered successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connecting or unreachable.' });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'iretina_clinical_secret_key_2026',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, patientId: user.patientId }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Doctor uploads scan -> Forwards to FastAPI
app.post('/api/reports/analyze', auth(['doctor']), upload.single('image'), async (req, res) => {
  try {
    const { patientEmail, doctorNotes } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file required.' });

    const patient = await User.findOne({ email: patientEmail, role: 'patient' });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found with this email.' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'retina.png',
      contentType: req.file.mimetype
    });

    const aiRes = await axios.post(process.env.FASTAPI_URL || 'http://127.0.0.1:8000/api/v1/diagnose', form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity
    });

    const ai = aiRes.data.data;

    const report = new Report({
      patient: patient._id,
      doctor: req.user.id,
      patientDisplayId: patient.patientId || 'PAT-000',
      patientName: patient.name,
      stage: ai.stage,
      stageTitle: ai.stage_title,
      confidence: ai.confidence,
      urgency: ai.urgency,
      lesionCount: ai.lesion_count,
      lesionAreaPercentage: ai.lesion_area_percentage,
      biomarkers: ai.biomarkers,
      clinicalRationale: ai.clinical_rationale,
      actionPlan: ai.action_plan,
      annotatedImageBase64: ai.annotated_image_base64,
      doctorNotes: doctorNotes || 'Validated by attending clinician.'
    });

    await report.save();
    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Doctor: View all reports
app.get('/api/reports/all', auth(['doctor']), async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Patient: View personal reports
app.get('/api/reports/my', auth(['patient']), async (req, res) => {
  try {
    const reports = await Report.find({ patient: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Download PDF
app.get('/api/reports/:id/pdf', auth(['doctor', 'patient']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    if (req.user.role === 'patient' && report.patient.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const patientUser = await User.findById(report.patient);
    const doctorUser = await User.findById(report.doctor);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=iRetina_${report.patientDisplayId}.pdf`);

    buildClinicalPdf(report, patientUser, doctorUser, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Node Gateway running on port ${PORT}`));