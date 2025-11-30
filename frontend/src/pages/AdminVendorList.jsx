import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { Link } from 'react-router-dom'

const STATUSES = ['all', 'incomplete', 'draft', 'pending', 'verified', 'rejected']

// Admin vendor dashboard with bulk actions, inline previews, and health metrics.
export default function AdminVendorList(){
  const [profiles, setProfiles] = useState([])
  const [selected, setSelected] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [openPreview, setOpenPreview] = useState({})

  const fetchProfiles = () => {
    setLoading(true)
    api.get('/vendors')
      .then(res => setProfiles(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProfiles()
    return () => {
      Object.values(openPreview).forEach(preview => {
        if (preview?.url) URL.revokeObjectURL(preview.url)
      })
    }
  // we intentionally skip openPreview here to avoid cleanup running repeatedly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredProfiles = useMemo(() => {
    if (filterStatus === 'all') return profiles
    return profiles.filter(profile => profile.status === filterStatus)
  }, [profiles, filterStatus])

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    const visibleIds = filteredProfiles.map(profile => profile._id)
    const allSelected = visibleIds.every(id => selected.includes(id))
    setSelected(allSelected ? selected.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])))
  }

  const cleanUrl = (url) => {
    if (!url) return url
    return url.startsWith('/api') ? url.replace('/api', '') : url
  }

  const previewDocument = async (vendorId, doc) => {
    const key = `${vendorId}-${doc.filename}`
    const existing = openPreview[vendorId]
    if (existing && existing.key === key) {
      URL.revokeObjectURL(existing.url)
      setOpenPreview(prev => {
        const copy = { ...prev }
        delete copy[vendorId]
        return copy
      })
      return
    }
    try {
      const response = await api.get(cleanUrl(doc.url), { responseType: 'blob' })
      const objectUrl = URL.createObjectURL(response.data)
      if (existing) URL.revokeObjectURL(existing.url)
      setOpenPreview(prev => ({ ...prev, [vendorId]: { key, url: objectUrl, mime: response.data.type } }))
    } catch (err) {
      console.error(err)
    }
  }

  const bulkUpdateStatus = async (status) => {
    if (!selected.length || status === 'all') return
    setBulkBusy(true)
    try {
      await Promise.all(selected.map(id => api.put(`/vendors/${id}/status`, { status })))
      setSelected([])
      fetchProfiles()
    } catch (err) {
      console.error(err)
    } finally {
      setBulkBusy(false)
    }
  }

  const updateStatus = async (id, status) => {
    setBulkBusy(true)
    try {
      await api.put(`/vendors/${id}/status`, { status })
      fetchProfiles()
    } catch (err) {
      console.error(err)
    } finally {
      setBulkBusy(false)
    }
  }

  const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`

  return (
    <div>
      <div className="top-row">
        <h2>Vendors</h2>
        <div className="actions">
          <button className="btn ghost" type="button" onClick={fetchProfiles} disabled={loading}>Refresh</button>
          <button className="btn ghost" type="button" onClick={toggleSelectAll} disabled={!filteredProfiles.length}>
            {filteredProfiles.length && filteredProfiles.every(profile => selected.includes(profile._id)) ? 'Clear selection' : 'Select visible'}
          </button>
        </div>
      </div>

      <div className="filters">
        <div>
          <label>Status filter</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUSES.map(status => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
          </select>
        </div>
        <div className="bulk-actions">
          <label>Bulk actions</label>
          <div className="bulk-buttons">
            <button className="btn small" type="button" disabled={!selected.length || bulkBusy} onClick={() => bulkUpdateStatus('pending')}>Mark Pending</button>
            <button className="btn small" type="button" disabled={!selected.length || bulkBusy} onClick={() => bulkUpdateStatus('verified')}>Verify</button>
            <button className="btn small danger" type="button" disabled={!selected.length || bulkBusy} onClick={() => bulkUpdateStatus('rejected')}>Reject</button>
          </div>
        </div>
        <div className="filter-actions">
          <p className="muted">Selected {selected.length} vendors</p>
        </div>
      </div>

      {loading ? (
        <p>Loading vendors...</p>
      ) : (
        <div className="list">
          {filteredProfiles.map(profile => {
            const completeness = profile.metrics?.completeness || 0
            const documentCoverage = profile.metrics?.documentCoverage || 0
            const riskFlags = profile.metrics?.riskFlags || []
            const preview = openPreview[profile._id]
            const experienceYears = profile.yearsExperience != null ? profile.yearsExperience : profile.metrics?.experienceYears || 0
            const projectsCompleted = profile.completedProjects != null ? profile.completedProjects : profile.metrics?.projectsCompleted || 0
            return (
              <div key={profile._id} className="card vendor-card">
                <div className="vendor-header">
                  <div>
                    <h4>{profile.companyName || '(no name)'}</h4>
                    <p className="muted">{profile.userId?.email}</p>
                    <span className={`status-pill status-${profile.status}`}>{profile.status}</span>
                  </div>
                  <div>
                    <input type="checkbox" checked={selected.includes(profile._id)} onChange={() => toggleSelect(profile._id)} />
                  </div>
                </div>

                <div className="metric-row inline">
                  <span>Profile</span>
                  <div className="progress small">
                    <div className="progress-bar" style={{ width: formatPercent(completeness) }}></div>
                  </div>
                  <span className="muted">{formatPercent(completeness)}</span>
                </div>
                <div className="metric-row inline">
                  <span>Documents</span>
                  <div className="progress small">
                    <div className="progress-bar" style={{ width: formatPercent(documentCoverage) }}></div>
                  </div>
                  <span className="muted">{formatPercent(documentCoverage)}</span>
                </div>

                <p className="muted" style={{ margin: '6px 0' }}>Experience: {experienceYears || 0} yrs • {projectsCompleted || 0} projects</p>

                {(profile.professionalRegistrations || []).length > 0 && (
                  <div className="chip-row">
                    {profile.professionalRegistrations.map((registration, index) => (
                      <span key={`${registration.body || 'body'}-${index}`} className="tag accent">
                        {registration.body || 'Registration'}
                        {registration.registrationNumber ? ` • ${registration.registrationNumber}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {riskFlags.length > 0 && (
                  <div className="risk-flags">
                    {riskFlags.map(flag => <span key={flag} className="tag warning">{flag.replace(/-/g, ' ')}</span>)}
                  </div>
                )}

                <div className="doc-row">
                  {(profile.documents || []).slice(0, 4).map(doc => (
                    <button key={doc._id || doc.filename} className="btn tiny" type="button" onClick={() => previewDocument(profile._id, doc)}>
                      Preview {doc.type?.toUpperCase() || 'DOC'}
                    </button>
                  ))}
                  {!(profile.documents || []).length && <p className="muted">No documents uploaded</p>}
                </div>

                {preview && (
                  <div className="preview-pane">
                    {preview.mime?.startsWith('image') ? (
                      <img src={preview.url} alt="Document preview" />
                    ) : (
                      <iframe src={preview.url} title="Document preview" />
                    )}
                  </div>
                )}

                <div className="actions">
                  <Link className="btn small" to={`/admin/vendors/${profile._id}`}>Review</Link>
                  <button className="btn small" type="button" onClick={() => updateStatus(profile._id, 'verified')} disabled={bulkBusy}>Quick verify</button>
                </div>
              </div>
            )
          })}
          {!filteredProfiles.length && <p className="muted">No vendors match this filter.</p>}
        </div>
      )}
    </div>
  )
}
