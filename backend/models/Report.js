const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientDisplayId: { type: String, required: true },
  patientName: { type: String, required: true },
  
  stage: { type: Number, required: true, min: 0, max: 4 },
  stageTitle: { type: String, required: true },
  confidence: { type: Number, required: true },
  urgency: { type: String, required: true },
  lesionCount: { type: Number, default: 0 },
  lesionAreaPercentage: { type: Number, default: 0.0 },
  
  biomarkers: { type: String, required: true },
  clinicalRationale: { type: String, required: true },
  actionPlan: [{ type: String }],
  
  annotatedImageBase64: { type: String, required: true },
  doctorNotes: { type: String, default: "Reviewed and validated by attending clinician." }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);