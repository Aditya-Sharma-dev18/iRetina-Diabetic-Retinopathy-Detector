import React, { useState } from 'react';
import API from '../api';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    patientId: '',
    age: '',
    gender: 'Male'
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await API.post('/auth/register', form);
        setIsRegister(false);
        alert('Registration complete. Please sign in.');
      } else {
        const res = await API.post('/auth/login', { email: form.email, password: form.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ width: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <ShieldCheck size={44} color="#38bdf8" style={{ margin: '0 auto 10px' }} />
          <h2>iRetina Clinical Portal</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Deep Retinopathy Diagnostic Platform</p>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label style={{ fontSize: '13px', color: '#94a3b8' }}>Full Name</label>
              <input 
                className="input-field" 
                type="text" 
                required 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />

              <label style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px', display: 'block' }}>Role</label>
              <select 
                className="input-field" 
                value={form.role} 
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="doctor">Screening Clinician (Doctor)</option>
                <option value="patient">Registered Patient</option>
              </select>

              {form.role === 'patient' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', color: '#94a3b8' }}>Age</label>
                    <input 
                      className="input-field" 
                      type="number" 
                      onChange={(e) => setForm({ ...form, age: e.target.value })} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', color: '#94a3b8' }}>Gender</label>
                    <select 
                      className="input-field" 
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          <label style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px', display: 'block' }}>Email Address</label>
          <input 
            className="input-field" 
            type="email" 
            required 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
          />

          <label style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px', display: 'block' }}>Password</label>
          <input 
            className="input-field" 
            type="password" 
            required 
            onChange={(e) => setForm({ ...form, password: e.target.value })} 
          />

          <button className="btn" type="submit" style={{ width: '100%', marginTop: '20px' }}>
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isRegister ? 'Register Account' : 'Authenticate'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '13px' }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Already registered? Login here.' : 'Need a new account? Register here.'}
          </button>
        </div>
      </div>
    </div>
  );
}