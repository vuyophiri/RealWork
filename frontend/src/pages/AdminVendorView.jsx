import React, { useEffect, useState } from 'react'
import api from '../api'
import { useParams } from 'react-router-dom'

export default function AdminVendorView(){
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    api.get(`/vendors/${id}`).then(r => setProfile(r.data)).catch(e => console.error(e))
  }, [id])

  const setStatus = async (status) => {
    try {
      await api.put(`/vendors/${id}/status`, { status, note })
      const res = await api.get(`/vendors/${id}`)
      setProfile(res.data)
      setNote('')
    } catch (err) {
      console.error(err)
    }
  }

  if (!profile) return <p>Loading...</p>

  const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`

  return (
    <div>
      <h2>Review Vendor</h2>
      <div className="card">
        <h3>{profile.companyName}</h3>
        <p className="muted">{profile.userId?.email}</p>
        <p>Status: <strong>{profile.status}</strong></p>
        <p>Reg #: {profile.registrationNumber} • VAT: {profile.vatNumber} • CSD: {profile.csdNumber}</p>

        <div className="card small" style={{ margin: '12px 0' }}>
          <h4>Capability snapshot</h4>
          <p className="muted">Experience: {profile.yearsExperience != null ? profile.yearsExperience : profile.metrics?.experienceYears || 0} yrs • Projects: {profile.completedProjects != null ? profile.completedProjects : profile.metrics?.projectsCompleted || 0}</p>
          {!!(profile.coreCapabilities || []).length && <p className="muted">Capabilities: {(profile.coreCapabilities || []).join(', ')}</p>}
          {!!(profile.industriesServed || []).length && <p className="muted">Industries: {(profile.industriesServed || []).join(', ')}</p>}
        </div>

        {(profile.professionalRegistrations || []).length > 0 && (
          <div className="card small" style={{ marginBottom: 12 }}>
            <h4>Professional registrations</h4>
            <ul className="muted-list">
              {profile.professionalRegistrations.map((registration, index) => (
                <li key={`${registration.body || 'body'}-${index}`}>
                  <strong>{registration.body || 'Registration'}</strong>
                  {registration.registrationNumber ? ` • ${registration.registrationNumber}` : ''}
                  {registration.expiry ? ` • Expiry ${new Date(registration.expiry).toLocaleDateString()}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="metrics">
          <div className="metric-row">
            <span>Profile completeness</span>
            <div className="progress">
              <div className="progress-bar" style={{ width: formatPercent(profile.metrics?.completeness) }}></div>
            </div>
            <span className="muted">{formatPercent(profile.metrics?.completeness)}</span>
          </div>
          <div className="metric-row">
            <span>Document coverage</span>
            <div className="progress">
              <div className="progress-bar" style={{ width: formatPercent(profile.metrics?.documentCoverage) }}></div>
            </div>
            <span className="muted">{formatPercent(profile.metrics?.documentCoverage)}</span>
          </div>
          <div className="metric-row">
            <span>Professional registrations</span>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${Math.min(100, (profile.metrics?.professionalBodies || 0) * 25)}%` }}></div>
            </div>
            <span className="muted">{profile.metrics?.professionalBodies || 0}</span>
          </div>
        </div>

        {profile.metrics?.missingFields?.length > 0 && (
          <div className="card small warning">
            <h4>Missing fields</h4>
            <ul>
              {profile.metrics.missingFields.map(field => <li key={field}>{field}</li>)}
            </ul>
          </div>
        )}

        {profile.metrics?.missingDocs?.length > 0 && (
          <div className="card small warning">
            <h4>Outstanding documents</h4>
            <ul>
              {profile.metrics.missingDocs.map(doc => <li key={doc}>{doc.toUpperCase()}</li>)}
            </ul>
          </div>
        )}

        {profile.metrics?.riskFlags?.length > 0 && (
          <div className="risk-flags" style={{ marginBottom: 16 }}>
            {profile.metrics.riskFlags.map(flag => <span key={flag} className="tag warning">{flag.replace(/-/g, ' ')}</span>)}
          </div>
        )}

        {!!(profile.autoExtracted && Object.keys(profile.autoExtracted).length) && (
          <div className="card small">
            <h4>Auto-extracted metadata</h4>
            <ul>
              {Object.entries(profile.autoExtracted).map(([key, value]) => (
                <li key={key}><strong>{key}</strong>: {value}</li>
              ))}
            </ul>
          </div>
        )}

        <h4>Directors</h4>
        <div className="list">
          {(profile.directors || []).map((director, index) => (
            <div key={index} className="card small">
              <p>{director.name} — {director.idNumber} — {director.role}</p>
            </div>
          ))}
        </div>

        <h4>Documents</h4>
        <div className="list">
          {(profile.documents || []).map(doc => (
            <div key={doc._id || doc.filename} className="card small">
              <p><strong>{doc.type}</strong> — {doc.filename} {doc.verified ? '(verified)' : ''}</p>
              <a className="btn small" href={doc.url} target="_blank" rel="noreferrer">Open</a>
            </div>
          ))}
        </div>

        <h4>Admin notes</h4>
        <textarea value={note} onChange={e => setNote(e.target.value)} />
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => setStatus('verified')}>Verify</button>
          <button className="btn" onClick={() => setStatus('rejected')}>Reject</button>
        </div>
        {profile.review?.lastReviewedAt && (
          <p className="muted" style={{ marginTop: 8 }}>Last reviewed {new Date(profile.review.lastReviewedAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}
