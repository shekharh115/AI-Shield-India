import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an image first!");

    setLoading(true);
    const formData = new FormData();
    // 'asset' must match upload.single('asset') in your Node.js controller
    formData.append('asset', file);
    formData.append('clientId', 'mumbai_marketing_agency_01');

    try {
      const response = await axios.post('http://localhost:5000/api/v1/sign', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      alert("Compliance Check Failed. Ensure Backend & Java are running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ borderBottom: '2px solid #0056b3', marginBottom: '20px' }}>
        <h1 style={{ color: '#0056b3' }}>🛡️ AI-Shield: MeitY 2026 Compliance</h1>
        <p>Official Provenance & Metadata Injection Portal</p>
      </header>

      <section style={{ background: '#f4f7f6', padding: '20px', borderRadius: '8px' }}>
        <h3>Step 1: Upload Synthetic Asset</h3>
        <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: '15px' }} />
        <br />
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{ padding: '10px 20px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Injecting Legal Metadata...' : 'Certify & Sign Asset'}
        </button>
      </section>

      {result && (
        <section style={{ marginTop: '30px', border: '1px solid #28a745', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#28a745' }}>✅ Asset Successfully Certified</h3>
          <p><strong>Database Record ID:</strong> {result.id || 'Logged to Atlas'}</p>
          <h4>Generated Legal Manifest:</h4>
          <pre style={{ background: '#222', color: '#0f0', padding: '15px', overflowX: 'auto', borderRadius: '5px', fontSize: '13px' }}>
            {result.manifest}
          </pre>
          <p style={{ fontSize: '12px', color: '#666' }}>
            *The original file in /uploads has been updated with persistent XMP tags.
          </p>
        </section>
      )}
    </div>
  );
}

export default App;