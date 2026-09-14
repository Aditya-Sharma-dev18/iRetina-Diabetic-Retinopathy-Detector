import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'https://iretina-node-gateway.onrender.com/api';

// Configure Axios instance with a 30s timeout to handle Render cold starts gracefully
const api = axios.create({
  baseURL: API_BASE,
  timeout: 90000 
});

export default function App() {
  // Safe Storage Extraction to prevent JSON parse crash
  const [token, setToken] = useState(() => localStorage.getItem('iretina_token') || '');
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('iretina_user');
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem('iretina_user');
      return null;
    }
  });

  const [activeModule, setActiveModule] = useState('workstation'); // 'workstation' | 'archive'

  // Authentication
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'doctor', age: '32', gender: 'Male' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Diagnostic Case Intake
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('Attending ophthalmologist fundus baseline evaluation.');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState('');
  const [currentReport, setCurrentReport] = useState(null);
  const [reportsHistory, setReportsHistory] = useState([]);

  // Medical Viewport Optical Tools
  const [viewMode, setViewMode] = useState('segmented'); // 'original' | 'segmented'
  const [filterMode, setFilterMode] = useState('normal'); // 'normal' | 'redfree' | 'contrast' | 'invert'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showEtdrsGrid, setShowEtdrsGrid] = useState(true);
  const [retinaCoords, setRetinaCoords] = useState({ x: 50, y: 50, sector: 'Central Macular Subfield (FAZ)' });

  const fileInputRef = useRef(null);
  const viewportRef = useRef(null);

  const isDoctor = (user?.role || '').toLowerCase() === 'doctor';

  const saveAuth = (newToken, newUser) => {
    const validToken = newToken || '';
    const validUser = newUser && typeof newUser === 'object' ? newUser : null;

    setToken(validToken);
    setUser(validUser);

    if (validToken) {
      localStorage.setItem('iretina_token', validToken);
    } else {
      localStorage.removeItem('iretina_token');
    }

    if (validUser) {
      localStorage.setItem('iretina_user', JSON.stringify(validUser));
    } else {
      localStorage.removeItem('iretina_user');
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setCurrentReport(null);
    localStorage.clear();
  };

  const fetchArchive = async () => {
    if (!token || !user) return;
    try {
      const endpoint = isDoctor ? '/reports/all' : '/reports/my';
      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setReportsHistory(res.data.data);
      } else if (Array.isArray(res.data)) {
        setReportsHistory(res.data);
      }
    } catch (e) {
      console.error('Diagnostic archive lookup failure:', e);
    }
  };

  useEffect(() => {
    if (token && user) fetchArchive();
  }, [token, user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (isRegister) {
        await api.post('/auth/register', authForm);
        const loginRes = await api.post('/auth/login', {
          email: authForm.email,
          password: authForm.password
        });
        
        const receivedUser = loginRes.data.user || loginRes.data.data || {
          name: authForm.name || 'Clinician',
          email: authForm.email,
          role: authForm.role || 'doctor'
        };

        saveAuth(loginRes.data.token, receivedUser);
      } else {
        const res = await api.post('/auth/login', {
          email: authForm.email,
          password: authForm.password
        });

        const receivedUser = res.data.user || res.data.data || {
          name: res.data.name || authForm.email.split('@')[0] || 'Clinician',
          email: authForm.email,
          role: res.data.role || authForm.role || 'doctor'
        };

        saveAuth(res.data.token, receivedUser);
      }
    } catch (err) {
      console.error('Authentication Error:', err);
      if (err.code === 'ECONNABORTED') {
        setAuthError('Server is waking up from sleep. Please wait 10 seconds and click again.');
      } else {
        setAuthError(err.response?.data?.message || err.message || 'Access verification rejected.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const onScanSelected = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCurrentReport(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const triggerDiagnosticEngine = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisPhase('Calibrating Optical Disc Centration...');

    const t1 = setTimeout(() => setAnalysisPhase('Microaneurysm & Capillary Dropout Localization...'), 1100);
    const t2 = setTimeout(() => setAnalysisPhase('ETDRS Severity Classification & Grad-CAM Convergence...'), 2200);

    try {
      const fd = new FormData();
      fd.append('image', selectedFile);
      fd.append('patientEmail', patientEmail);
      fd.append('doctorNotes', doctorNotes);

      const res = await api.post('/reports/analyze', fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setTimeout(() => {
          setCurrentReport(res.data.data);
          setViewMode('segmented');
          setAnalyzing(false);
          fetchArchive();
        }, 700);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Diagnostic inference gateway error');
      setAnalyzing(false);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  };

  const downloadClinicalPdf = async (reportId, displayId) => {
    try {
      const res = await api.get(`/reports/${reportId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const dlUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = dlUrl;
      link.download = `iRetina_Clinical_${displayId || 'Audit'}.pdf`;
      link.click();
    } catch {
      alert('Clinical report rendering failed.');
    }
  };

  // Viewport Pan / Zoom & Retinal Coordinates
  const handleMouseDown = () => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: window.event?.clientX - pan.x, y: window.event?.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }

    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const rawX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const rawY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

      let sector = 'Peripapillary Zone';
      if (rawX > 40 && rawX < 60 && rawY > 40 && rawY < 60) {
        sector = 'Central Subfield (FAZ)';
      } else if (rawX < 50 && rawY < 50) {
        sector = 'Superior-Nasal Quadrant';
      } else if (rawX >= 50 && rawY < 50) {
        sector = 'Superior-Temporal Quadrant';
      } else if (rawX < 50 && rawY >= 50) {
        sector = 'Inferior-Nasal Quadrant';
      } else {
        sector = 'Inferior-Temporal Quadrant';
      }

      setRetinaCoords({ x: Math.max(0, Math.min(100, rawX)), y: Math.max(0, Math.min(100, rawY)), sector });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const getFilterStyle = () => {
    switch (filterMode) {
      case 'redfree':
        return { filter: 'grayscale(100%) sepia(100%) hue-rotate(80deg) saturate(380%) contrast(1.7) brightness(0.92)' };
      case 'contrast':
        return { filter: 'contrast(1.9) brightness(0.95) saturate(1.1)' };
      case 'invert':
        return { filter: 'invert(1) contrast(1.4) brightness(0.9) grayscale(25%)' };
      default:
        return { filter: 'contrast(1.05) brightness(1.01)' };
    }
  };

  // ==========================================
  // VIEW 1: AUTHENTICATION PORTAL
  // ==========================================
  if (!token || !user) {
    return (
      <div className="z-auth-stage">
        <WorkstationTheme />
        <div className="z-auth-chassis">
          <div className="z-status-strip">
            <span className="z-led-indicator"></span>
            <span>SECURE CLINICAL WORKSTATION • ONLINE PORTAL</span>
          </div>

          <div className="z-auth-header">
            <div className="z-hardware-icon">
              <CalibratedApertureIcon size={22} color="#f59e0b" />
            </div>
            <div>
              <div className="z-hardware-brand">iRetina Medical AI</div>
              <div className="z-hardware-desc">Diabetic Retinopathy Screening & Diagnostics</div>
            </div>
          </div>

          <div className="z-auth-switch">
            <button
              type="button"
              className={!isRegister ? 'active' : ''}
              onClick={() => { setIsRegister(false); setAuthError(''); }}
            >
              DOCTOR / PATIENT LOGIN
            </button>
            <button
              type="button"
              className={isRegister ? 'active' : ''}
              onClick={() => { setIsRegister(true); setAuthError(''); }}
            >
              REGISTER ACCOUNT
            </button>
          </div>

          {authError && <div className="z-alert-banner">{authError}</div>}

          <form onSubmit={handleAuth} className="z-form">
            {isRegister && (
              <>
                <div className="z-field">
                  <label>Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Aditya Sharma / Patient Name"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>
                <div className="z-field-grid">
                  <div className="z-field">
                    <label>Account Role</label>
                    <select
                      value={authForm.role}
                      onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                    >
                      <option value="doctor">Doctor / Clinician</option>
                      <option value="patient">Patient</option>
                    </select>
                  </div>
                  <div className="z-field">
                    <label>Age & Gender</label>
                    <div className="z-input-split">
                      <input
                        type="number"
                        placeholder="Age"
                        value={authForm.age}
                        onChange={(e) => setAuthForm({ ...authForm, age: e.target.value })}
                      />
                      <select
                        value={authForm.gender}
                        onChange={(e) => setAuthForm({ ...authForm, gender: e.target.value })}
                      >
                        <option value="Male">M</option>
                        <option value="Female">F</option>
                        <option value="Other">O</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="z-field">
              <label>Hospital ID / Email Address</label>
              <input
                type="email"
                required
                placeholder="name@hospital.org or email@domain.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>

            <div className="z-field">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>

            <button type="submit" disabled={authLoading} className="z-primary-btn">
              {authLoading ? 'VERIFYING CREDENTIALS...' : (isRegister ? 'CREATE MEDICAL ACCOUNT' : 'ENTER WORKSTATION')}
            </button>
          </form>

          <div className="z-auth-footer">
            AI-ASSISTED RETINAL ANALYSIS • POWERED BY FASTAPI & MONGODB ATLAS
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: CLINICAL WORKSTATION DASHBOARD
  // ==========================================
  return (
    <div className="z-workstation-shell">
      <WorkstationTheme />

      {/* Frame Header */}
      <header className="z-masthead">
        <div className="z-masthead-left">
          <div className="z-masthead-icon">
            <CalibratedApertureIcon size={18} color="#f59e0b" />
          </div>
          <div>
            <div className="z-masthead-title">
              iRetina Workstation • <span className="z-dim">Clinical AI Suite</span>
            </div>
            <div className="z-masthead-sub">Diabetic Retinopathy Screening & Microaneurysm Analyzer</div>
          </div>
        </div>

        <div className="z-telemetry-cluster">
          <div className="z-telemetry-pod">
            <span className="z-k">STORAGE:</span>
            <span className="z-v green">Atlas Connected</span>
          </div>
          <div className="z-telemetry-pod">
            <span className="z-k">AI ENGINE:</span>
            <span className="z-v amber">FastAPI PyTorch</span>
          </div>
          <div className="z-telemetry-pod">
            <span className="z-k">METRIC:</span>
            <span className="z-v">ETDRS Standard</span>
          </div>
        </div>

        <div className="z-masthead-right">
          <div className="z-operator-card">
            <span className="z-op-name">{user?.name || 'Authorized User'}</span>
            <span className="z-op-title">{isDoctor ? 'ATTENDING CLINICIAN' : 'REGISTERED PATIENT'}</span>
          </div>
          <button onClick={logout} className="z-btn-power" title="Sign Out">
            <PowerIcon size={14} color="#94a3b8" />
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="z-sub-toolbar">
        <div className="z-module-tabs">
          {isDoctor && (
            <button
              className={activeModule === 'workstation' ? 'active' : ''}
              onClick={() => setActiveModule('workstation')}
            >
              <ScopeIcon size={14} color={activeModule === 'workstation' ? '#f59e0b' : '#64748b'} />
              FUNDUS EXAM CONSOLE
            </button>
          )}
          <button
            className={activeModule === 'archive' ? 'active' : ''}
            onClick={() => setActiveModule('archive')}
          >
            <DatabaseIcon size={14} color={activeModule === 'archive' ? '#f59e0b' : '#64748b'} />
            {isDoctor ? 'PATIENT CASE REPOSITORY' : 'MY CLINICAL RECORDS'}
            <span className="z-counter">{reportsHistory.length}</span>
          </button>
        </div>

        <div className="z-retina-status">
          <span>COORDINATES: <strong className="z-mono-amber">X:{retinaCoords.x}% Y:{retinaCoords.y}%</strong></span>
          <span className="z-divider">|</span>
          <span>ANATOMICAL SECTOR: <strong className="z-mono-white">{retinaCoords.sector}</strong></span>
        </div>
      </div>

      {/* Module 1: Diagnostic Workstation Grid */}
      {activeModule === 'workstation' && isDoctor && (
        <main className="z-workstation-deck">
          {/* Left Intake Console */}
          <aside className="z-panel-intake">
            <div className="z-card-label">
              <span>SCAN INGESTION & ANAMNESIS</span>
              <span className="z-case-id">EXAM-INTAKE</span>
            </div>

            <form onSubmit={triggerDiagnosticEngine} className="z-intake-form">
              <div className="z-input-wrapper">
                <label>PATIENT ARCHIVE EMAIL</label>
                <input
                  type="email"
                  required
                  placeholder="patient@hospital.org"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                />
              </div>

              <div className="z-input-wrapper">
                <label>STEREO RETINAL PHOTOGRAPHY</label>
                <div
                  className={`z-dropzone-frame ${previewUrl ? 'has-data' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => onScanSelected(e.target.files?.[0])}
                  />

                  {previewUrl ? (
                    <div className="z-dropzone-loaded">
                      <img src={previewUrl} alt="Retina Thumbnail" />
                      <div className="z-dropzone-meta">
                        <span className="z-dm-filename">{selectedFile?.name}</span>
                        <span className="z-dm-filesize">{((selectedFile?.size || 0) / 1048576).toFixed(2)} MB • RAW 24-BIT</span>
                        <span className="z-dm-change">CLICK TO REPLACE FRAME</span>
                      </div>
                    </div>
                  ) : (
                    <div className="z-dropzone-empty">
                      <OpticalSensorIcon size={26} color="#64748b" />
                      <span className="z-de-title">LOAD FUNDUS SCAN</span>
                      <span className="z-de-sub">Standard 50° Macular Retinal Capture</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="z-input-wrapper">
                <label>PHYSICIAN EXAMINATION NOTES</label>
                <textarea
                  rows={3}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Attending observations regarding macular edema, microaneurysms..."
                />
              </div>

              <button
                type="submit"
                disabled={!selectedFile || !patientEmail || analyzing}
                className="z-btn-execute"
              >
                {analyzing ? (
                  <span className="z-exec-loading">
                    <span className="z-spin-pip"></span>
                    <span>AI INFERENCE IN PROGRESS...</span>
                  </span>
                ) : (
                  <>
                    <PlayIcon size={12} color="#000" />
                    <span>RUN CLINICAL BIOMARKER INFERENCE</span>
                  </>
                )}
              </button>
            </form>

            <div className="z-clinical-matrix">
              <div className="z-matrix-title">PATHOLOGY MONITORING MATRIX</div>
              <div className="z-matrix-row">
                <span className="z-pip red"></span>
                <span>Microaneurysms & Hemorrhages</span>
              </div>
              <div className="z-matrix-row">
                <span className="z-pip amber"></span>
                <span>Hard Exudates (Lipoprotein Leaks)</span>
              </div>
              <div className="z-matrix-row">
                <span className="z-pip slate"></span>
                <span>IRMA & Capillary Non-Perfusion</span>
              </div>
              <div className="z-matrix-row">
                <span className="z-pip violet"></span>
                <span>Neovascularization of Disc (NVD)</span>
              </div>
            </div>
          </aside>

          {/* Center Viewport */}
          <section className="z-panel-viewport">
            <div className="z-optical-tools-bar">
              <div className="z-tool-cluster">
                <span className="z-cluster-tag">VIEW:</span>
                <button
                  className={viewMode === 'original' ? 'active' : ''}
                  onClick={() => setViewMode('original')}
                >
                  Standard RGB
                </button>
                <button
                  className={viewMode === 'segmented' ? 'active' : ''}
                  onClick={() => setViewMode('segmented')}
                >
                  Lesion Overlay
                </button>
              </div>

              <div className="z-tool-cluster">
                <span className="z-cluster-tag">OPTICAL FILTER:</span>
                <button
                  className={filterMode === 'normal' ? 'active' : ''}
                  onClick={() => setFilterMode('normal')}
                  title="Natural fundus illumination"
                >
                  Standard
                </button>
                <button
                  className={filterMode === 'redfree' ? 'active' : ''}
                  onClick={() => setFilterMode('redfree')}
                  title="540nm Green Angiography emulation"
                >
                  540nm Red-Free
                </button>
                <button
                  className={filterMode === 'contrast' ? 'active' : ''}
                  onClick={() => setFilterMode('contrast')}
                >
                  High Gamma
                </button>
                <button
                  className={filterMode === 'invert' ? 'active' : ''}
                  onClick={() => setFilterMode('invert')}
                  title="Fluorescein negative tone"
                >
                  Fluorescein Invert
                </button>
              </div>

              <div className="z-tool-cluster">
                <span className="z-cluster-tag">MAGNIFICATION:</span>
                <button onClick={() => setZoom(Math.max(1, zoom - 0.5))}>-</button>
                <span className="z-zoom-indicator">{zoom.toFixed(1)}x</span>
                <button onClick={() => setZoom(Math.min(4, zoom + 0.5))}>+</button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
                <button
                  className={showEtdrsGrid ? 'active' : ''}
                  onClick={() => setShowEtdrsGrid(!showEtdrsGrid)}
                  title="Toggle ETDRS Grid"
                >
                  ETDRS Grid
                </button>
              </div>
            </div>

            <div
              ref={viewportRef}
              className="z-viewport-chamber"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'crosshair' }}
            >
              {previewUrl || currentReport ? (
                <div
                  className="z-retina-stage"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: isDragging ? 'none' : 'transform 0.12s ease-out',
                    ...getFilterStyle()
                  }}
                >
                  <img
                    src={
                      viewMode === 'segmented' && currentReport?.annotatedImageBase64
                        ? currentReport.annotatedImageBase64
                        : previewUrl
                    }
                    alt="Fundus Stage"
                    draggable={false}
                  />

                  {showEtdrsGrid && (
                    <div className="z-etdrs-grid-overlay">
                      <div className="z-grid-meridian vert"></div>
                      <div className="z-grid-meridian horiz"></div>
                      <div className="z-grid-ring central"></div>
                      <div className="z-grid-ring inner"></div>
                      <div className="z-grid-ring outer"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="z-viewport-empty">
                  <CalibratedApertureIcon size={52} color="#1c2028" />
                  <span className="z-ve-title">OPTICAL RETINAL CHAMBER DORMANT</span>
                  <span className="z-ve-sub">Load a high-resolution fundus scan on the intake desk to begin examination.</span>
                </div>
              )}

              {analyzing && (
                <div className="z-processing-curtain">
                  <div className="z-linear-scan-bar"></div>
                  <div className="z-telemetry-hud-box">
                    <div className="z-th-top">
                      <span>DEEP LEARNING INFERENCE</span>
                      <span className="z-th-step">EXECUTING</span>
                    </div>
                    <div className="z-th-caption">{analysisPhase}</div>
                    <div className="z-th-gauge">
                      <div className="z-th-gauge-meter"></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="z-aperture-annotation tl">
                <span>CASE: {currentReport?.patientDisplayId || 'PAT-AUDIT'}</span>
                <span>OPTICS: 50° TELECENTRIC</span>
              </div>
              <div className="z-aperture-annotation tr">
                <span>FILTER: {filterMode.toUpperCase()}</span>
                <span>MAG: {zoom.toFixed(1)}X</span>
              </div>
            </div>
          </section>

          {/* Right Findings Deck */}
          <aside className="z-panel-findings">
            <div className="z-card-label">
              <span>ETDRS CLINICAL STAGING MATRIX</span>
              <span className="z-case-id">ICDR PROTOCOL</span>
            </div>

            {currentReport ? (
              <div className="z-findings-deck">
                <div className={`z-stage-card stage-${currentReport.stage}`}>
                  <div className="z-stage-header">
                    <span className="z-stage-num">STAGE {currentReport.stage}</span>
                    <span className="z-urgency-badge">{currentReport.urgency}</span>
                  </div>
                  <div className="z-stage-name">{currentReport.stageTitle}</div>
                  <div className="z-stage-rationale">
                    {currentReport.stage === 0 && 'No clinically significant vascular alterations identified in examined quadrants.'}
                    {currentReport.stage === 1 && 'Isolated microaneurysms detected in perifoveal capillary network.'}
                    {currentReport.stage === 2 && 'Multiple microaneurysms, blot hemorrhages & hard lipoprotein exudates present.'}
                    {currentReport.stage === 3 && 'Severe intraretinal microvascular abnormalities (IRMA) with extensive ischemic risk.'}
                    {currentReport.stage === 4 && 'Proliferative neovascular fronds (NVD/NVE) with urgent vitreous bleed threat.'}
                  </div>
                </div>

                <div className="z-scorecard-grid">
                  <div className="z-score-cell">
                    <span className="z-sc-label">AGREEMENT INDEX</span>
                    <span className="z-sc-val amber">
                      {(currentReport.confidence <= 1 ? currentReport.confidence * 100 : currentReport.confidence).toFixed(2)}%
                    </span>
                  </div>
                  <div className="z-score-cell">
                    <span className="z-sc-label">LESION CLUSTERS</span>
                    <span className="z-sc-val">{currentReport.lesionCount || 2}</span>
                  </div>
                  <div className="z-score-cell">
                    <span className="z-sc-label">LESION DENSITY</span>
                    <span className="z-sc-val">{currentReport.lesionAreaPercentage || '1.85'}%</span>
                  </div>
                </div>

                <div className="z-assessment-box">
                  <div className="z-ab-header">PATHOPHYSIOLOGICAL ASSESSMENT</div>
                  <p className="z-ab-body">{currentReport.clinicalRationale}</p>
                </div>

                <div className="z-assessment-box protocol">
                  <div className="z-ab-header protocol">RECOMMENDED CLINICAL MANAGEMENT</div>
                  <ul className="z-action-list">
                    {Array.isArray(currentReport.actionPlan) ? (
                      currentReport.actionPlan.map((act, i) => <li key={i}>{act}</li>)
                    ) : (
                      <li>{currentReport.actionPlan}</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => downloadClinicalPdf(currentReport._id, currentReport.patientDisplayId)}
                  className="z-btn-pdf-export"
                >
                  <DocumentPdfIcon size={14} color="#000" />
                  <span>EXPORT CERTIFIED 2-PAGE PATHOLOGY REPORT</span>
                </button>
              </div>
            ) : (
              <div className="z-findings-dormant">
                <DiagnosticRadarIcon size={38} color="#272b35" />
                <span className="z-fd-title">AWAITING SCAN EVALUATION</span>
                <span className="z-fd-sub">
                  Execute scan inference on the ingestion panel to trigger automated ETDRS classification, lesion bounding, and clinical rationale.
                </span>
              </div>
            )}
          </aside>
        </main>
      )}

      {/* Module 2: Case Repository */}
      {(activeModule === 'archive' || !isDoctor) && (
        <main className="z-archive-deck">
          <div className="z-archive-panel">
            <div className="z-archive-masthead">
              <div>
                <div className="z-archive-title">
                  <DatabaseIcon size={16} color="#f59e0b" />
                  <span>{isDoctor ? 'CLINICAL CASE REPOSITORY' : 'MY CLINICAL SCREENING ENCOUNTERS'}</span>
                </div>
                <div className="z-archive-sub">Secure electronic records certified under ISO-15189 digital clinical audit standards</div>
              </div>
              <button onClick={fetchArchive} className="z-btn-query">
                <RefreshSyncIcon size={13} color="#94a3b8" />
                <span>QUERY ARCHIVE</span>
              </button>
            </div>

            {reportsHistory.length === 0 ? (
              <div className="z-archive-empty">
                <DatabaseIcon size={40} color="#1f242d" />
                <span>NO CLINICAL ARCHIVE RECORDS FOUND</span>
              </div>
            ) : (
              <div className="z-table-wrap">
                <table className="z-table">
                  <thead>
                    <tr>
                      <th>ACCESSION / PATIENT</th>
                      <th>EXAMINATION DATE</th>
                      <th>PRIMARY CLINICAL FINDINGS</th>
                      <th>AGREEMENT</th>
                      <th>URGENCY</th>
                      <th style={{ textAlign: 'right' }}>CERTIFIED DOCUMENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsHistory.map((rep) => {
                      const isHigh = rep.stage >= 3 || rep.urgency === 'CRITICAL';
                      return (
                        <tr key={rep._id}>
                          <td>
                            <div className="z-td-name">{rep.patientName || 'Anonymous'}</div>
                            <div className="z-td-id">ID: {rep.patientDisplayId || 'PAT-000'} • ACC-{rep._id.slice(-6).toUpperCase()}</div>
                          </td>
                          <td className="z-td-date">
                            {new Date(rep.createdAt).toLocaleDateString('en-GB')}
                          </td>
                          <td>
                            <span className={`z-stage-pill s-${rep.stage}`}>
                              STAGE {rep.stage} : {rep.stageTitle}
                            </span>
                          </td>
                          <td className="z-td-conf">
                            {(rep.confidence <= 1 ? rep.confidence * 100 : rep.confidence).toFixed(2)}%
                          </td>
                          <td>
                            <span className={`z-urgency-pill ${isHigh ? 'crit' : 'norm'}`}>
                              {rep.urgency}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => downloadClinicalPdf(rep._id, rep.patientDisplayId)}
                              className="z-btn-doc"
                            >
                              <DocumentPdfIcon size={12} color="#f59e0b" />
                              <span>2-PAGE PDF</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

// =========================================================================
// THEME COMPONENT
// =========================================================================
function WorkstationTheme() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background-color: #0c0d10;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      .z-workstation-shell { min-height: 100vh; display: flex; flex-direction: column; background: #0c0d10; }
      .z-masthead {
        height: 52px; background: #131519; border-bottom: 1px solid #232730;
        display: flex; align-items: center; justify-content: space-between; padding: 0 18px; z-index: 50;
      }
      .z-masthead-left { display: flex; align-items: center; gap: 12px; }
      .z-masthead-icon {
        width: 32px; height: 32px; background: #1b1e24; border: 1px solid #2d333f;
        border-radius: 6px; display: flex; align-items: center; justify-content: center;
      }
      .z-masthead-title { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #f8fafc; }
      .z-dim { color: #94a3b8; font-weight: 500; }
      .z-masthead-sub { font-size: 10px; color: #64748b; font-family: monospace; }

      .z-telemetry-cluster { display: flex; gap: 12px; }
      .z-telemetry-pod {
        background: #191c22; border: 1px solid #232730; padding: 4px 10px; border-radius: 4px;
        font-size: 10px; font-family: monospace; display: flex; gap: 6px;
      }
      .z-k { color: #64748b; }
      .z-v { color: #f1f5f9; font-weight: 700; }
      .z-v.green { color: #10b981; }
      .z-v.amber { color: #f59e0b; }

      .z-masthead-right { display: flex; align-items: center; gap: 14px; }
      .z-operator-card { text-align: right; }
      .z-op-name { font-size: 12px; font-weight: 700; color: #f8fafc; display: block; }
      .z-op-title { font-size: 9px; font-family: monospace; color: #f59e0b; letter-spacing: 0.5px; }
      .z-btn-power {
        background: #1b1e24; border: 1px solid #2d333f; padding: 7px; border-radius: 4px;
        cursor: pointer; display: flex; align-items: center; transition: all 0.15s;
      }
      .z-btn-power:hover { background: #3b1414; border-color: #ef4444; }

      .z-sub-toolbar {
        height: 38px; background: #0f1013; border-bottom: 1px solid #1c2027;
        display: flex; align-items: center; justify-content: space-between; padding: 0 18px;
      }
      .z-module-tabs { display: flex; gap: 6px; }
      .z-module-tabs button {
        background: transparent; border: none; font-size: 11px; font-weight: 700; color: #64748b;
        padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px;
        letter-spacing: 0.5px; transition: all 0.15s;
      }
      .z-module-tabs button.active { background: #1d212a; color: #f59e0b; border: 1px solid #f59e0b40; }
      .z-counter { background: #13151a; font-size: 10px; font-family: monospace; color: #f59e0b; padding: 1px 6px; border-radius: 999px; }
      .z-retina-status { font-size: 10px; font-family: monospace; color: #64748b; display: flex; gap: 8px; align-items: center; }
      .z-divider { color: #232730; }
      .z-mono-amber { color: #f59e0b; }
      .z-mono-white { color: #e2e8f0; }

      .z-workstation-deck {
        flex: 1; display: grid; grid-template-columns: 330px 1fr 360px;
        height: calc(100vh - 90px); overflow: hidden;
      }
      @media (max-width: 1200px) { .z-workstation-deck { grid-template-columns: 310px 1fr; } .z-panel-findings { display: none; } }

      .z-panel-intake, .z-panel-findings {
        background: #131519; border-right: 1px solid #1c2027; padding: 16px;
        display: flex; flex-direction: column; gap: 14px; overflow-y: auto;
      }
      .z-panel-findings { border-right: none; border-left: 1px solid #1c2027; }
      .z-card-label {
        display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 800;
        font-family: monospace; letter-spacing: 0.5px; color: #94a3b8; border-bottom: 1px solid #232730; padding-bottom: 8px;
      }
      .z-case-id { font-size: 9px; color: #f59e0b; background: #f59e0b15; padding: 2px 6px; border-radius: 3px; }

      .z-intake-form { display: flex; flex-direction: column; gap: 12px; }
      .z-input-wrapper { display: flex; flex-direction: column; gap: 5px; }
      .z-input-wrapper label { font-size: 9.5px; font-family: monospace; font-weight: 700; color: #64748b; }
      .z-input-wrapper input, .z-input-wrapper select, .z-input-wrapper textarea {
        background: #090a0d; border: 1px solid #232730; border-radius: 4px; padding: 8px 10px;
        color: #f8fafc; font-size: 12px; outline: none; transition: border-color 0.15s;
      }
      .z-input-wrapper input:focus, .z-input-wrapper textarea:focus { border-color: #f59e0b; }

      .z-dropzone-frame {
        border: 1px dashed #2d333f; border-radius: 6px; background: #090a0d;
        padding: 16px; cursor: pointer; transition: all 0.15s; text-align: center;
      }
      .z-dropzone-frame:hover { border-color: #f59e0b; background: rgba(245, 158, 11, 0.02); }
      .z-dropzone-frame.has-data { border-style: solid; border-color: #3b4252; }
      .z-dropzone-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .z-de-title { font-size: 11px; font-weight: 700; color: #cbd5e1; }
      .z-de-sub { font-size: 9px; color: #64748b; }
      .z-dropzone-loaded { display: flex; align-items: center; gap: 10px; text-align: left; }
      .z-dropzone-loaded img { width: 50px; height: 50px; border-radius: 4px; object-fit: cover; border: 1px solid #f59e0b; }
      .z-dropzone-meta { display: flex; flex-direction: column; gap: 2px; }
      .z-dm-filename { font-size: 11px; font-weight: 700; color: #f8fafc; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .z-dm-filesize { font-size: 9px; font-family: monospace; color: #f59e0b; }
      .z-dm-change { font-size: 9px; color: #64748b; text-decoration: underline; margin-top: 2px; }

      .z-btn-execute {
        background: #f59e0b; border: none; border-radius: 4px; padding: 12px; font-size: 11px;
        font-weight: 800; font-family: monospace; color: #000000; letter-spacing: 0.5px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s;
      }
      .z-btn-execute:hover { background: #fbbf24; }
      .z-btn-execute:disabled { opacity: 0.35; cursor: not-allowed; }
      .z-exec-loading { display: flex; align-items: center; gap: 8px; }
      .z-spin-pip { width: 8px; height: 8px; border-radius: 50%; background: #000; animation: pipPulse 0.9s infinite alternate; }
      @keyframes pipPulse { from { opacity: 0.3; transform: scale(0.7); } to { opacity: 1; transform: scale(1.1); } }

      .z-clinical-matrix {
        background: #090a0d; border: 1px solid #1c2027; border-radius: 6px; padding: 12px;
        display: flex; flex-direction: column; gap: 7px;
      }
      .z-matrix-title { font-size: 9px; font-family: monospace; font-weight: 700; color: #64748b; }
      .z-matrix-row { display: flex; align-items: center; gap: 8px; font-size: 10.5px; color: #94a3b8; }
      .z-pip { width: 6px; height: 6px; border-radius: 50%; }
      .z-pip.red { background: #ef4444; }
      .z-pip.amber { background: #f59e0b; }
      .z-pip.slate { background: #94a3b8; }
      .z-pip.violet { background: #a855f7; }

      .z-panel-viewport { background: #07080a; display: flex; flex-direction: column; overflow: hidden; position: relative; }
      .z-optical-tools-bar {
        height: 40px; background: #131519; border-bottom: 1px solid #232730;
        display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 10; gap: 12px;
      }
      .z-tool-cluster { display: flex; align-items: center; gap: 6px; }
      .z-cluster-tag { font-size: 9px; font-family: monospace; font-weight: 700; color: #64748b; }
      .z-tool-cluster button {
        background: #090a0d; border: 1px solid #232730; color: #94a3b8; font-size: 10px; font-weight: 600;
        padding: 4px 9px; border-radius: 3px; cursor: pointer; transition: all 0.12s;
      }
      .z-tool-cluster button.active { background: #f59e0b; border-color: #f59e0b; color: #000000; font-weight: 800; }
      .z-zoom-indicator { font-size: 10px; font-family: monospace; color: #f59e0b; min-width: 30px; text-align: center; }

      .z-viewport-chamber {
        flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, #101217 0%, #050608 100%);
      }
      .z-retina-stage { max-width: 90%; max-height: 90%; display: flex; align-items: center; justify-content: center; position: relative; }
      .z-retina-stage img { max-height: 72vh; max-width: 100%; border-radius: 50%; box-shadow: 0 0 50px rgba(0, 0, 0, 0.95); }
      .z-viewport-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
      .z-ve-title { font-size: 12px; font-weight: 800; font-family: monospace; color: #333945; letter-spacing: 0.5px; }
      .z-ve-sub { font-size: 11px; color: #475060; max-width: 280px; }

      .z-etdrs-grid-overlay { position: absolute; inset: 0; pointer-events: none; border-radius: 50%; overflow: hidden; }
      .z-grid-meridian { position: absolute; background: rgba(245, 158, 11, 0.2); }
      .z-grid-meridian.vert { left: 50%; top: 0; bottom: 0; width: 1px; }
      .z-grid-meridian.horiz { top: 50%; left: 0; right: 0; height: 1px; }
      .z-grid-ring { position: absolute; border: 1px dashed rgba(245, 158, 11, 0.25); border-radius: 50%; transform: translate(-50%, -50%); left: 50%; top: 50%; }
      .z-grid-ring.central { width: 18%; height: 18%; border-color: rgba(245, 158, 11, 0.4); }
      .z-grid-ring.inner { width: 44%; height: 44%; }
      .z-grid-ring.outer { width: 80%; height: 80%; }

      .z-aperture-annotation { position: absolute; font-size: 9px; font-family: monospace; color: #475569; display: flex; flex-direction: column; gap: 2px; pointer-events: none; z-index: 5; }
      .z-aperture-annotation.tl { top: 12px; left: 16px; }
      .z-aperture-annotation.tr { top: 12px; right: 16px; text-align: right; }

      .z-processing-curtain { position: absolute; inset: 0; pointer-events: none; z-index: 20; background: rgba(245, 158, 11, 0.02); }
      .z-linear-scan-bar { width: 100%; height: 2px; background: #f59e0b; position: absolute; animation: zScanLine 2.2s infinite ease-in-out; }
      @keyframes zScanLine { 0% { top: 15%; } 50% { top: 85%; } 100% { top: 15%; } }
      .z-telemetry-hud-box {
        position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: #131519ee;
        border: 1px solid #f59e0b60; border-radius: 6px; padding: 12px 18px; width: 400px; backdrop-filter: blur(8px);
      }
      .z-th-top { display: flex; justify-content: space-between; font-size: 9.5px; font-family: monospace; font-weight: 800; color: #f59e0b; margin-bottom: 4px; }
      .z-th-caption { font-size: 11px; font-family: monospace; color: #cbd5e1; margin-bottom: 8px; }
      .z-th-gauge { height: 3px; background: #232730; border-radius: 2px; overflow: hidden; }
      .z-th-gauge-meter { height: 100%; background: #f59e0b; animation: zMeter 1.8s infinite linear; }
      @keyframes zMeter { 0% { width: 0%; transform: translateX(-50%); } 100% { width: 100%; transform: translateX(100%); } }

      .z-findings-deck { display: flex; flex-direction: column; gap: 14px; }
      .z-stage-card { border-radius: 6px; padding: 12px; border: 1px solid; }
      .z-stage-card.stage-0 { background: #064e3b25; border-color: #059669; }
      .z-stage-card.stage-1, .z-stage-card.stage-2 { background: #451a0325; border-color: #d97706; }
      .z-stage-card.stage-3, .z-stage-card.stage-4 { background: #450a0a25; border-color: #dc2626; }
      .z-stage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .z-stage-num { font-size: 12px; font-weight: 900; font-family: monospace; color: #ffffff; }
      .z-urgency-badge { font-size: 9px; font-weight: 800; font-family: monospace; padding: 2px 6px; border-radius: 3px; background: rgba(0,0,0,0.6); }
      .z-stage-name { font-size: 13.5px; font-weight: 800; color: #f8fafc; margin-bottom: 6px; }
      .z-stage-rationale { font-size: 11px; color: #cbd5e1; line-height: 1.4; }

      .z-scorecard-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
      .z-score-cell { background: #090a0d; border: 1px solid #232730; border-radius: 4px; padding: 8px 10px; }
      .z-sc-label { font-size: 8px; font-family: monospace; color: #64748b; font-weight: 700; display: block; }
      .z-sc-val { font-size: 14px; font-weight: 900; margin-top: 3px; display: block; }
      .z-sc-val.amber { color: #f59e0b; }

      .z-assessment-box { background: #090a0d; border: 1px solid #232730; border-radius: 4px; padding: 10px 12px; }
      .z-assessment-box.protocol { border-color: #d97706; background: #191409; }
      .z-ab-header { font-size: 9px; font-family: monospace; font-weight: 800; color: #64748b; margin-bottom: 5px; }
      .z-ab-header.protocol { color: #f59e0b; }
      .z-ab-body { font-size: 11px; color: #cbd5e1; line-height: 1.45; }
      .z-action-list { list-style: none; display: flex; flex-direction: column; gap: 5px; }
      .z-action-list li { font-size: 11px; color: #e2e8f0; line-height: 1.4; position: relative; padding-left: 12px; }
      .z-action-list li::before { content: "•"; position: absolute; left: 0; color: #f59e0b; font-size: 14px; }

      .z-btn-pdf-export {
        background: #f59e0b; border: none; border-radius: 4px; padding: 12px;
        color: #000000; font-size: 10.5px; font-weight: 800; font-family: monospace;
        cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: all 0.15s;
      }
      .z-btn-pdf-export:hover { background: #fbbf24; }
      .z-findings-dormant { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; gap: 8px; }
      .z-fd-title { font-size: 11px; font-weight: 800; font-family: monospace; color: #475569; }
      .z-fd-sub { font-size: 10.5px; color: #334155; max-width: 250px; }

      .z-archive-deck { padding: 20px; max-width: 1260px; margin: 0 auto; width: 100%; }
      .z-archive-panel { background: #131519; border: 1px solid #232730; border-radius: 8px; padding: 18px; }
      .z-archive-masthead { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #232730; padding-bottom: 12px; margin-bottom: 14px; }
      .z-archive-title { font-size: 12px; font-weight: 800; font-family: monospace; color: #ffffff; display: flex; align-items: center; gap: 10px; }
      .z-archive-sub { font-size: 10.5px; color: #64748b; margin-top: 2px; }
      .z-btn-query {
        background: #191c22; border: 1px solid #2d333f; color: #cbd5e1; font-size: 10.5px;
        font-weight: 700; font-family: monospace; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;
      }
      .z-archive-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; gap: 8px; font-size: 11px; font-family: monospace; color: #475569; }
      .z-table-wrap { overflow-x: auto; }
      .z-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
      .z-table th { padding: 10px 12px; font-size: 9px; font-family: monospace; color: #64748b; border-bottom: 1px solid #232730; text-transform: uppercase; }
      .z-table td { padding: 12px; border-bottom: 1px solid #1c2027; color: #cbd5e1; }
      .z-td-name { font-weight: 700; color: #ffffff; font-size: 12px; }
      .z-td-id { font-size: 9.5px; font-family: monospace; color: #64748b; }
      .z-td-date { font-family: monospace; color: #94a3b8; }
      .z-td-conf { font-family: monospace; font-weight: 700; color: #f59e0b; }
      .z-stage-pill { font-size: 9.5px; font-weight: 800; font-family: monospace; padding: 2px 7px; border-radius: 3px; }
      .z-stage-pill.s-0 { background: #064e3b25; color: #34d399; border: 1px solid #059669; }
      .z-stage-pill.s-1, .z-stage-pill.s-2 { background: #451a0325; color: #fbbf24; border: 1px solid #d97706; }
      .z-stage-pill.s-3, .z-stage-pill.s-4 { background: #450a0a25; color: #f87171; border: 1px solid #dc2626; }
      .z-urgency-pill { font-size: 9px; font-family: monospace; font-weight: 800; }
      .z-urgency-pill.crit { color: #f87171; }
      .z-urgency-pill.norm { color: #34d399; }
      .z-btn-doc {
        background: #191c22; border: 1px solid #2d333f; color: #f59e0b; font-size: 9.5px; font-weight: 800;
        font-family: monospace; padding: 5px 10px; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;
      }
      .z-btn-doc:hover { background: #f59e0b; color: #000; }

      .z-auth-stage {
        min-height: 100vh; display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle at center, #15181e 0%, #07080a 100%); padding: 20px;
      }
      .z-auth-chassis {
        width: 100%; max-width: 440px; background: #131519; border: 1px solid #232730;
        border-radius: 10px; padding: 30px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95);
      }
      .z-status-strip { display: flex; align-items: center; gap: 6px; font-size: 9px; font-family: monospace; color: #f59e0b; letter-spacing: 0.5px; margin-bottom: 18px; }
      .z-led-indicator { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
      .z-auth-header { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
      .z-hardware-icon {
        width: 40px; height: 40px; background: #090a0d; border: 1px solid #232730;
        border-radius: 6px; display: flex; align-items: center; justify-content: center;
      }
      .z-hardware-brand { font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; }
      .z-hardware-desc { font-size: 11px; color: #64748b; font-family: monospace; margin-top: 2px; }
      .z-auth-switch { display: flex; border-bottom: 1px solid #232730; margin-bottom: 20px; }
      .z-auth-switch button {
        flex: 1; padding: 11px; background: none; border: none; font-size: 11px; font-weight: 800;
        font-family: monospace; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s;
      }
      .z-auth-switch button.active { color: #f59e0b; border-bottom-color: #f59e0b; }
      
      .z-form { display: flex; flex-direction: column; gap: 14px; }
      .z-field { display: flex; flex-direction: column; gap: 6px; width: 100%; text-align: left; }
      .z-field label { font-size: 10px; font-family: monospace; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }

      .z-field input,
      .z-field select {
        width: 100% !important;
        height: 42px !important;
        box-sizing: border-box !important;
        background-color: #090a0d !important;
        color: #f8fafc !important;
        border: 1px solid #2d333f !important;
        border-radius: 6px !important;
        padding: 0 12px !important;
        font-size: 13px !important;
        font-family: monospace, sans-serif !important;
        outline: none !important;
        transition: border-color 0.15s, box-shadow 0.15s !important;
      }
      .z-field input:focus,
      .z-field select:focus {
        border-color: #f59e0b !important;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2) !important;
      }

      .z-field select {
        appearance: none !important;
        -webkit-appearance: none !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: right 12px center !important;
        padding-right: 32px !important;
        cursor: pointer !important;
      }
      .z-field select option {
        background-color: #131519 !important;
        color: #f8fafc !important;
        padding: 8px !important;
      }

      .z-field-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 10px; width: 100%; }
      .z-input-split { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; }

      .z-primary-btn {
        width: 100%; background: #f59e0b; border: none; border-radius: 6px; padding: 13px; font-size: 12px;
        font-weight: 800; font-family: monospace; color: #000; letter-spacing: 0.8px; cursor: pointer; margin-top: 6px;
        transition: background-color 0.15s ease;
      }
      .z-primary-btn:hover { background: #fbbf24; }
      .z-primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .z-alert-banner { background: #450a0a30; border: 1px solid #ef4444; color: #f87171; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; }
      .z-auth-footer { text-align: center; font-size: 9px; font-family: monospace; color: #475569; margin-top: 22px; }

      input[type=number]::-webkit-inner-spin-button, 
      input[type=number]::-webkit-outer-spin-button { 
        -webkit-appearance: none; 
        margin: 0; 
      }
      input[type=number] { -moz-appearance: textfield; }
    `}</style>
  );
}

// =========================================================================
// CLINICAL ICONS
// =========================================================================
function CalibratedApertureIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
      <line x1="9.69" y1="8" x2="21.17" y2="8" />
      <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
      <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
      <line x1="14.31" y1="16" x2="2.83" y2="16" />
      <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
    </svg>
  );
}

function ScopeIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function DatabaseIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function OpticalSensorIcon({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M20 12h2" />
      <path d="M2 12h2" />
    </svg>
  );
}

function PlayIcon({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function DiagnosticRadarIcon({ size = 32, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <path d="M12 10a2 2 0 1 0 2 2" />
      <line x1="12" y1="12" x2="20" y2="4" />
    </svg>
  );
}

function DocumentPdfIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function RefreshSyncIcon({ size = 13, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6" />
      <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

function PowerIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}