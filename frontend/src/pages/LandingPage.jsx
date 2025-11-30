import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TenderDashboard from '../components/TenderDashboard'
import api from '../api'

export default function LandingPage() {
  const token = localStorage.getItem('token')
  const [vendorStatus, setVendorStatus] = useState(null)

  useEffect(() => {
    if (token) {
      api.get('/vendors/me')
        .then(res => setVendorStatus(res.data?.status))
        .catch(() => {})
    }
  }, [token])

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #0b74da 0%, #0666c7 100%)',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center',
        borderRadius: '0 0 20px 20px',
        marginBottom: '40px'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px', fontWeight: '800', margin: '0 0 16px 0' }}>
          Build Your Future with RealWork
        </h1>
        <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 32px', opacity: '0.9' }}>
          The premier platform connecting construction professionals with verified tenders and project opportunities.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          {!token && (
            <>
              <Link to="/register" className="btn" style={{ background: 'white', color: '#0b74da', padding: '12px 24px', fontSize: '1.1rem', border: 'none' }}>
                Get Started
              </Link>
              <Link to="/login" className="btn ghost" style={{ borderColor: 'white', color: 'white', padding: '12px 24px', fontSize: '1.1rem' }}>
                Login
              </Link>
            </>
          )}
          {token && (
             <Link to="/vendor" className="btn" style={{ background: 'white', color: '#0b74da', padding: '12px 24px', fontSize: '1.1rem', border: 'none' }}>
                {vendorStatus === 'verified' ? 'View Profile' : vendorStatus === 'pending' ? 'Check Status' : 'Complete Your Profile'}
              </Link>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container" style={{ marginBottom: '60px' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ marginTop: 0 }}>Smart Matching</h3>
            <p className="muted">Our algorithm matches your profile with tenders that fit your experience, grade, and location.</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✅</div>
            <h3 style={{ marginTop: 0 }}>Verified Opportunities</h3>
            <p className="muted">Access legitimate tenders from verified clients. No more ghost projects or scams.</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📄</div>
            <h3 style={{ marginTop: 0 }}>Streamlined Compliance</h3>
            <p className="muted">Upload your documents once. We help you keep your compliance pack up to date.</p>
          </div>
        </div>
      </div>

      {/* Live Tenders Section */}
      <div className="container">
        <TenderDashboard />
      </div>

      {/* Footer */}
      <footer style={{ background: '#fff', padding: '40px 20px', marginTop: '80px', borderTop: '1px solid #eee', textAlign: 'center' }}>
        <p className="muted">© 2025 RealWork. All rights reserved.</p>
      </footer>
    </div>
  )
}
