import React, { useState, useEffect } from 'react';
import API from '../api';
import { UploadCloud, FileText, Activity } from 'lucide-react';

export default function DoctorDashboard({ user, onLogout }) {
  const [reports, setReports] = useState([]);
  const [patientEmail, setPatientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await API.get('/reports/all');
      setReports(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleScanUpload = async (e) => {
    e.preventDefault();
    if (!file || !patientEmail) return alert('Select fundus image and provide patient email.');

    setLoading(true);
    setLatestAnalysis(null);
    const data = new FormData();
    data.append('image', file);
    data.append('patientEmail', patientEmail);
    data.append('doctorNotes', notes);

    try {
      const res = await API.post('/reports/analyze', data);
      setLatestAnalysis(res.data.data);
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Inference analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (id, patientId) => {
    try {
      const res = await API.get(`/reports/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `iRetina_Report_${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate PDF document.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Clinician Diagnostics Hub</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Attending Specialist: Dr. {user.name}</p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout}>Sign Out</button>
      </div>

      <div className="card">
        <h3><UploadCloud size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Initiate AI Screening</h3>
        <form onSubmit={handleScanUpload} style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>Target Patient Email</label>
            <input 
              className="input-field" 
              type="email" 
              required 
              placeholder="patient@hospital.org" 
              value={patientEmail} 
              onChange={(e) => setPatientEmail(e.target.value)} 
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>Clinical Observation Notes</label>
            <input 
              className="input-field" 
              type="text" 
              placeholder="e.g., Screening indicates focal lesions" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>Fundus Scan Image</label>
            <input 
              className="input-field" 
              type="file" 
              accept="image/*" 
              required 
              onChange={(e) => setFile(e.target.files[0])} 
            />
          </div>
          <div style={{ gridColumn: 'span 3', textAlign: 'right' }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Running DenseNet121 Inference...' : 'Analyze Retina Scan'}
            </button>
          </div>
        </form>
      </div>

      {latestAnalysis && (
        <div className="card" style={{ borderColor: '#0284c7' }}>
          <h3 style={{ color: '#38bdf8' }}><Activity size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Focal Lesion Localization Evidence</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginTop: '16px' }}>
            <div>
              <img 
                src={latestAnalysis.annotatedImageBase64} 
                alt="Boxed Scan" 
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #334155' }} 
              />
              <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '6px' }}>
                Grad-CAM Bounding Localization
              </p>
            </div>
            <div>
              <span className={`badge badge-stage-${latestAnalysis.stage}`}>{latestAnalysis.stageTitle}</span>
              <p style={{ marginTop: '12px' }}><strong>Diagnostic Confidence:</strong> {latestAnalysis.confidence}%</p>
              <p style={{ marginTop: '6px' }}><strong>Focal Lesions:</strong> {latestAnalysis.lesionCount} cluster(s) mapped (~{latestAnalysis.lesionAreaPercentage}% field)</p>
              <p style={{ marginTop: '6px' }}><strong>Biomarkers:</strong> {latestAnalysis.biomarkers}</p>
              <p style={{ marginTop: '6px', color: '#94a3b8' }}>{latestAnalysis.clinicalRationale}</p>
              
              <button 
                className="btn" 
                style={{ marginTop: '16px' }}
                onClick={() => downloadPdf(latestAnalysis._id, latestAnalysis.patientDisplayId)}
              >
                <FileText size={16} /> Generate 2-Page Clinical PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3><FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Patient Diagnostic Records</h3>
        <div className="table-wrapper" style={{ marginTop: '16px' }}>
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Diagnosis Stage</th>
                <th>Confidence</th>
                <th>Urgency</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r._id}>
                  <td><strong>{r.patientDisplayId}</strong></td>
                  <td>{r.patientName}</td>
                  <td><span className={`badge badge-stage-${r.stage}`}>{r.stageTitle}</span></td>
                  <td>{r.confidence}%</td>
                  <td style={{ color: r.urgency === 'CRITICAL' ? '#ef4444' : '#f8fafc' }}>{r.urgency}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => downloadPdf(r._id, r.patientDisplayId)}>
                      <FileText size={14} /> Download PDF
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>No screening records logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}