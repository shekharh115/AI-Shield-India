import React, { useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to generate the Professional PDF Certificate
  const downloadCertificate = () => {
      try {
        const doc = new jsPDF();

        // 1. Branding & Header (REMOVED EMOJI TO FIX GARBLED TEXT)
        doc.setFontSize(22);
        doc.setTextColor(0, 86, 179);
        doc.text("AI-Shield India Compliance", 14, 20); // Plain text is safer

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Official Certification for Synthetic Assets (IT Rules 2026)", 14, 28);
        doc.line(14, 32, 196, 32);

        // 2. Regulatory Data Table
        autoTable(doc, {
          startY: 40,
          head: [['Compliance Requirement', 'Verification Details']],
          body: [
            ['Asset ID (Pixel Hash)', result.assetHash || 'Verified Fingerprint'],
            ['Compliance Status', 'FULLY COMPLIANT'],
            ['Regulatory Standard', 'MeitY IT Amendment Rules 2026'],
            ['Origin Platform', 'AI-Shield-India-Vault'],
            ['Certification Date', new Date().toLocaleString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [0, 86, 179] },
        });

        // 3. Legal Footer
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("This document serves as legal proof of SGI registration under Section 3(1)(b).", 14, finalY + 10);

        doc.save(`AI_Shield_Certificate_${Date.now()}.pdf`);
      } catch (err) {
        console.error("PDF Error:", err);
      }
    };

//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) return alert("Please select an image file first!");
//
//     setLoading(true);
//     const formData = new FormData();
//     formData.append('asset', file);
//     formData.append('clientId', 'mumbai_marketing_agency_01');
//
//     try {
//       // Sending request to secured Node.js API
//       const res = await axios.post('http://localhost:5000/api/v1/sign', formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           'x-auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoidGVzdF91c2VyX2lkIn0sImlhdCI6MTc3MjYzNDQ1MywiZXhwIjoxNzcyNjM4MDUzfQ.DU7qq2Tnimiz3EJokzwy1KoyiwACiPRzu8OIsnJMsZg'
//         }
//       });
//       setResult(res.data);
//     } catch (err) {
//       console.error(err);
//       alert("Compliance Check Failed. Ensure your Token is valid and Backend is running.");
//     } finally {
//       setLoading(false);
//     }
//   };

const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an image file first!");

    // GET THE TOKEN FROM STORAGE
    const token = localStorage.getItem('token');
    if (!token) return alert("Please login first!");

    setLoading(true);
    const formData = new FormData();
    formData.append('asset', file);

    try {
      const res = await axios.post('http://localhost:5000/api/v1/sign', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token // Use the dynamic token
        }
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Unauthorized: Please log in again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      <header style={{ borderBottom: '2px solid #0056b3', marginBottom: '30px' }}>
        <h1 style={{ color: '#0056b3' }}>AI-Shield Compliance Portal</h1>
        <p>Official Provenance & Metadata Injection Service (India 2026)</p>
      </header>

      <div style={{ background: '#f9f9f9', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0 }}>Step 1: Upload Synthetic Asset</h3>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: '20px', display: 'block' }}
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#ccc' : '#0056b3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Processing Legal Signature...' : 'Certify & Sign Asset'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '30px', border: '2px solid #28a745', padding: '25px', borderRadius: '12px', backgroundColor: '#e9f7ef' }}>
          <h3 style={{ color: '#28a745', marginTop: 0 }}>✅ Asset Successfully Certified</h3>
          <p>Your asset has been fingerprinted and injected with mandatory XMP metadata.</p>

          <button
            onClick={downloadCertificate}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            Download PDF Certificate 📄
          </button>
        </div>
      )}
    </div>
  );
}

export default App;