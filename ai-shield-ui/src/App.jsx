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

  // 3. Dashboard View State
  const [viewTab, setViewTab] = useState('upload'); // 'upload' or 'history'
  const [historyLogs, setHistoryLogs] = useState([]);

  // Sync token with localStorage whenever it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Fetch history when the user clicks the History tab
  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/history', {
        headers: { 'x-auth-token': token }
      });
      setHistoryLogs(res.data.logs);
    } catch (err) {
      console.error("Error fetching history", err);
    }
  };

  useEffect(() => {
    if (viewTab === 'history') {
      fetchHistory();
    }
  }, [viewTab]);

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
    // Note: clientId is now handled securely on the backend via the token!

    try {
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
    if (!result) return;
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

  // UI FOR LOGGED IN USERS (DASHBOARD)
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0056b3', marginBottom: '30px', paddingBottom: '10px' }}>
        <h1 style={{ color: '#0056b3', margin: 0 }}>AI-Shield Portal</h1>
        <div>
          <button onClick={() => setViewTab('upload')} style={{ background: 'none', border: 'none', fontSize: '16px', marginRight: '15px', cursor: 'pointer', fontWeight: viewTab === 'upload' ? 'bold' : 'normal', color: viewTab === 'upload' ? '#0056b3' : '#333' }}>
            Upload Asset
          </button>
          <button onClick={() => setViewTab('history')} style={{ background: 'none', border: 'none', fontSize: '16px', marginRight: '25px', cursor: 'pointer', fontWeight: viewTab === 'history' ? 'bold' : 'normal', color: viewTab === 'history' ? '#0056b3' : '#333' }}>
            History & Analytics
          </button>
          <button onClick={() => setToken(null)} style={{ background: 'white', border: '1px solid red', color: 'red', borderRadius: '4px', cursor: 'pointer', padding: '6px 12px' }}>
            Logout
          </button>
        </div>
      </header>

      {/* UPLOAD TAB */}
      {viewTab === 'upload' && (
        <div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '12px' }}>
          <h3>Step 1: Upload Synthetic Asset</h3>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginBottom: '10px', display: 'block' }}
          />

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

          {result && (
            <div style={{ marginTop: '30px', border: '2px solid #28a745', padding: '25px', borderRadius: '12px', backgroundColor: '#e9f7ef' }}>
              <h3 style={{ color: '#28a745', marginTop: 0 }}>✅ Asset Successfully Certified</h3>

              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button onClick={downloadCertificate} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Download PDF Certificate 📄
                </button>

                <a
                  href={`http://localhost:5000/${result.downloadPath}`}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '12px 24px', backgroundColor: '#0056b3', color: 'white', textDecoration: 'none', borderRadius: '6px', textAlign: 'center' }}
                >
                  Download Protected Image 🖼️
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {viewTab === 'history' && (
        <div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0 }}>Your Certification History</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>Showing {historyLogs.length} assets secured.</p>

          <div style={{ overflowX: 'auto' }}>
                     <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                                   <thead>
                                     <tr style={{ backgroundColor: '#0056b3', color: 'white', textAlign: 'left' }}>
                                       <th style={{ padding: '12px', border: '1px solid #ddd' }}>Date Secured</th>
                                       <th style={{ padding: '12px', border: '1px solid #ddd' }}>Asset Preview</th>
                                       <th style={{ padding: '12px', border: '1px solid #ddd' }}>Asset Name</th>
                                       <th style={{ padding: '12px', border: '1px solid #ddd' }}>Status</th>
                                       {/* NEW: Column for the Download action */}
                                       <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Action</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {historyLogs.map(log => {

                                       // 1. ROBUST DATE FALLBACK LOGIC
                                       let displayDate = "Unknown Date";
                                       if (log.timestamp) {
                                         const dbDate = new Date(log.timestamp);
                                         if (!isNaN(dbDate.getTime())) displayDate = dbDate.toLocaleString();
                                       } else if (log.assetHash && log.assetHash.includes('-')) {
                                         const extractedTime = parseInt(log.assetHash.split('-')[0]);
                                         if (!isNaN(extractedTime)) displayDate = new Date(extractedTime).toLocaleString();
                                       }

                                       // 2. SAFE NAME CLEANUP
                                       const cleanName = log.assetHash.includes('-')
                                         ? log.assetHash.substring(log.assetHash.indexOf('-') + 1)
                                         : log.assetHash;

                                       return (
                                         <tr key={log._id} style={{ borderBottom: '1px solid #ddd', verticalAlign: 'middle' }}>

                                           {/* Fixed Date Display */}
                                           <td style={{ padding: '12px', color: '#333' }}>{displayDate}</td>

                                           <td style={{ padding: '12px', textAlign: 'center' }}>
                                             <img
                                               src={`http://localhost:5000/uploads/${log.assetHash}`}
                                               alt="Secured Asset"
                                               style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc' }}
                                             />
                                           </td>

                                           <td style={{ padding: '12px', wordBreak: 'break-all', fontWeight: '500', color: '#333' }}>
                                             {cleanName}
                                           </td>

                                           <td style={{ padding: '12px', color: 'green', fontWeight: 'bold' }}>COMPLIANT ✅</td>

                                           {/* NEW: The Download Button */}
                                           <td style={{ padding: '12px', textAlign: 'center' }}>
                                             <a
                                               href={`http://localhost:5000/uploads/${log.assetHash}`}
                                               download
                                               target="_blank"
                                               rel="noreferrer"
                                               style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', display: 'inline-block' }}
                                             >
                                               ⬇️ Download
                                             </a>
                                           </td>

                                         </tr>
                                       );
                                     })}
                                     {historyLogs.length === 0 && (
                                       <tr>
                                         <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                           No history found. Go secure some assets!
                                         </td>
                                       </tr>
                                     )}
                                   </tbody>
                                 </table>
                    </div>
        </div>
      )}
    </div>
  );
}

export default App;