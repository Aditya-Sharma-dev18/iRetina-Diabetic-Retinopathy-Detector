import React, { useState, useEffect } from 'react';
import API from '../api';
import { Eye, Download } from 'lucide-react';

export default function PatientDashboard({ user, onLogout }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    API.get('/reports/my')
      .then(res => setReports(res.data.data))
      .catch(err => console.error(err));
  }, []);

  const downloadPdf = async (id, patientId) => {
    try {
      const res = await API.get(`/reports/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `My_Retina_Report_${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Could not download your report.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Patient Health Portal</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Welcome, {user.name} ({user.patientId || 'ID Assigned'})</p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout}>Sign Out</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {reports.map((r) => (
          <div className="card" key={r._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className={`badge badge-stage-${r.stage}`}>{r.stageTitle}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>

            <div style={{ margin: '16px 0', textAlign: 'center' }}>
              <img 
                src={r.annotatedImageBase64} 
                alt="Retinal scan" 
                style={{ width: '220px', height: '220px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #334155' }} 
              />
            </div>

            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Confidence:</strong> {r.confidence}%
            </p>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>
              {r.clinicalRationale}
            </p>

            <button className="btn" style={{ width: '100%' }} onClick={() => downloadPdf(r._id, r.patientDisplayId)}>
              <Download size={16} /> Download 2-Page Medical Report
            </button>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
            <Eye size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#94a3b8' }}>No retinal screening records logged for this account yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}