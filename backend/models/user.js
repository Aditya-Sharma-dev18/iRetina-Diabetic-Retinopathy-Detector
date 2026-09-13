const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'patient'], default: 'patient' },
  patientId: { type: String, unique: true, sparse: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);