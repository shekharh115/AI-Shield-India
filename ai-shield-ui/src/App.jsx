import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  // 1. Authentication State
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoginView, setIsLoginView] = useState(true);
  const [authFormData, setAuthFormData] = useState({ name: '', email: '', password: '' });

  // 2. Upload & Result State
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync token with localStorage whenever it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? '/api/v1/login' : '/api/v1/register';
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, authFormData);
      setToken(res.data.token);
      alert(isLoginView ? "Login Successful!" : "Account Created!");
    } catch (err) {
      alert(err.response?.data?.msg || "Authentication Failed");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an image file first!");

    setLoading(true);
    const formData = new FormData();
    formData.append('asset', file);
    formData.append('clientId', 'mumbai_marketing_agency_01');

    try {
      // Use the dynamic token from state instead of a hardcoded string
      const res = await axios.post('http://localhost:5000/api/v1/sign', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token
        }
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Compliance Check Failed. Your session might have expired.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(0, 86, 179);
    doc.text("AI-Shield India Compliance", 14, 20);

    autoTable(doc, {
      startY: 40,
      head: [['Compliance Requirement', 'Verification Details']],
      body: [
        ['Asset ID', result.assetHash || 'Verified'],
        ['Status', 'FULLY COMPLIANT'],
        ['Standard', 'MeitY IT Rules 2026'],
        ['Date', new Date().toLocaleString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 86, 179] },
    });
    doc.save(`Certificate_${Date.now()}.pdf`);
  };

  // UI FOR LOGIN / REGISTER
  if (!token) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto', fontFamily: 'sans-serif' }}>
        <h2>{isLoginView ? 'Login' : 'Register'} to AI-Shield</h2>
        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isLoginView && (
            <input
              placeholder="Full Name"
              required
              onChange={(e) => setAuthFormData({...authFormData, name: e.target.value})}
              style={{ padding: '10px' }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            onChange={(e) => setAuthFormData({...authFormData, email: e.target.value})}
            style={{ padding: '10px' }}
          />
          <input
            type="password"
            placeholder="Password"
            required
            onChange={(e) => setAuthFormData({...authFormData, password: e.target.value})}
            style={{ padding: '10px' }}
          />
          <button type="submit" style={{ padding: '10px', backgroundColor: '#0056b3', color: 'white', border: 'none', cursor: 'pointer' }}>
            {isLoginView ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <p onClick={() => setIsLoginView(!isLoginView)} style={{ cursor: 'pointer', color: '#0056b3', marginTop: '15px', textAlign: 'center' }}>
          {isLoginView ? "Need an account? Register here" : "Already have an account? Login"}
        </p>
      </div>
    );
  }

  // UI FOR LOGGED IN USERS (UPLOAD DASHBOARD)
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', marginBottom: '30px' }}>
        <h1 style={{ color: '#0056b3' }}>AI-Shield Portal</h1>
        <button onClick={() => setToken(null)} style={{ background: 'none', border: '1px solid red', color: 'red', cursor: 'pointer', padding: '5px 10px' }}>Logout</button>
      </header>

<div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '12px' }}>
  <h3>Step 1: Upload Synthetic Asset</h3>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => setFile(e.target.files[0])}
    style={{ marginBottom: '10px', display: 'block' }}
  />

  {/* The filename display fix */}
  {file ? (
    <div style={{ marginBottom: '20px', fontSize: '14px', color: '#333' }}>
      <strong>Selected File:</strong> {file.name}
    </div>
  ) : (
    <p style={{ marginBottom: '20px', fontSize: '14px', color: '#888' }}>No file chosen</p>
  )}

  <button
    onClick={handleUpload}
    disabled={loading}
    style={{ padding: '12px 24px', backgroundColor: loading ? '#ccc' : '#0056b3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
  >
    {loading ? 'Processing...' : 'Certify & Sign Asset'}
  </button>
</div>


      {result && (
        <div style={{ marginTop: '30px', border: '2px solid #28a745', padding: '25px', borderRadius: '12px', backgroundColor: '#e9f7ef' }}>
          <h3 style={{ color: '#28a745' }}>✅ Asset Successfully Certified</h3>
          <button onClick={downloadCertificate} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Download PDF Certificate 📄
          </button>
        </div>
      )}
    </div>
  );
}

export default App;