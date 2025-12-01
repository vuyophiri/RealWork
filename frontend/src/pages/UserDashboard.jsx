import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

// User dashboard shows user's submitted applications
export default function UserDashboard(){
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [previewingId, setPreviewingId] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const currentUserId = user?._id || user?.id
  const hasMethodDocument = (application) => Boolean(application?.methodDocumentId || application?.methodDocument)

  useEffect(() => {
    let mounted = true
    const fetchApps = async () => {
      if (!currentUserId) {
        if (mounted) {
          setApps([])
          setLoading(false)
          setError('Sign in to view your applications.')
        }
        return
      }
      if (mounted) {
        setLoading(true)
        setError('')
      }
      try {
        const res = await api.get(`/applications/user/${currentUserId}`)
        if (mounted) {
          setApps(res.data || [])
        }
      } catch (e) {
        console.error(e)
        if (mounted) {
          setApps([])
          const message = e.response?.data?.message || 'Unable to load your applications right now.'
          setError(message)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchApps()
    return () => { mounted = false }
  }, [currentUserId])

  const formatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 })
  const statusMeta = {
    submitted: { label: 'Submitted', tone: 'submitted' },
    'under-review': { label: 'Under Review', tone: 'under-review' },
    accepted: { label: 'Accepted', tone: 'accepted' },
    rejected: { label: 'Rejected', tone: 'rejected' }
  }
  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—'
  const formatDuration = (value) => {
    if (!value) return '—'
    const rounded = Number(value)
    if (!Number.isFinite(rounded)) return '—'
    return `${rounded} wk${rounded === 1 ? '' : 's'}`
  }
  const toggleDetails = (id) => setExpandedId(expandedId === id ? null : id)
  useEffect(() => {
    return () => {
      if (previewData?.url) {
        window.URL.revokeObjectURL(previewData.url)
      }
    }
  }, [previewData])

  const downloadMethodology = async (app) => {
  if (!hasMethodDocument(app)) return
    setError('')
    setDownloadingId(app._id)
    try {
      const response = await api.get(`/applications/${app._id}/method-document?download=1`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = app.methodDocumentName || `methodology-${app._id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      const message = err.response?.data?.message || 'Unable to download the methodology document.'
      setError(message)
    } finally {
      setDownloadingId(null)
    }
  }

  const closePreview = () => {
    if (previewData?.url) {
      window.URL.revokeObjectURL(previewData.url)
    }
    setPreviewData(null)
  }

  const previewMethodology = async (app) => {
  if (!hasMethodDocument(app)) return
    setError('')
    setPreviewingId(app._id)
    try {
      const response = await api.get(`/applications/${app._id}/method-document`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
  setPreviewData({ url, name: app.methodDocumentName || `methodology-${app._id}.pdf`, appId: app._id })
    } catch (err) {
      console.error(err)
      const message = err.response?.data?.message || 'Unable to open the methodology document.'
      setError(message)
    } finally {
      setPreviewingId(null)
    }
  }

  const withdrawApplication = async (app) => {
    if (!window.confirm('Withdraw this application? This action cannot be undone.')) return
    setError('')
    setWithdrawingId(app._id)
    try {
      await api.delete(`/applications/${app._id}`)
      setApps(prev => prev.filter(item => item._id !== app._id))
      if (expandedId === app._id) setExpandedId(null)
      if (previewData?.appId === app._id) closePreview()
    } catch (err) {
      console.error(err)
      const message = err.response?.data?.message || 'Failed to withdraw your application.'
      setError(message)
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <>
      <div className="card">
        <div className="dashboard-header">
          <div>
            <h2 style={{ margin: 0 }}>My Applications</h2>
            <p className="muted" style={{ marginTop: 4 }}>Track every bid you have submitted and review the details in one place.</p>
          </div>
        </div>

        {loading && <p className="muted">Loading your applications…</p>}
        {!loading && error && <p className="error">{error}</p>}
        {!loading && !error && apps.length === 0 && <p>You have not submitted any applications yet.</p>}

        {!loading && apps.length > 0 && (
          <div className="applications-table-wrap">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Tender</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Bid Amount</th>
                <th>Duration</th>
                <th style={{ width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const tender = app.tenderId
                const status = statusMeta[app.status] || statusMeta.submitted
                const hasMethodDoc = hasMethodDocument(app)
                const isExpanded = expandedId === app._id
                return (
                  <React.Fragment key={app._id}>
                    <tr>
                      <td>
                        <div className="tender-cell">
                          <span className="tender-title">{tender?.title || 'Tender no longer available'}</span>
                          <span className="muted small-text">{tender?.referenceNumber ? `Ref: ${tender.referenceNumber}` : 'No reference supplied'}</span>
                        </div>
                      </td>
                      <td>{formatDate(app.createdAt)}</td>
                      <td>
                        <span className={`status-pill status-${status.tone}`}>{status.label}</span>
                      </td>
                      <td>{app.proposedAmount ? formatter.format(app.proposedAmount) : '—'}</td>
                      <td>{formatDuration(app.durationWeeks)}</td>
                      <td>
                        <div className="inline-actions">
                          <button type="button" className="link-btn" onClick={() => toggleDetails(app._id)}>
                            {isExpanded ? 'Hide details' : 'View details'}
                          </button>
                          {tender?._id && (
                            <Link to={`/tenders/${tender._id}`} className="link-btn muted-link">View tender</Link>
                          )}
                          <button
                            type="button"
                            className="link-btn danger-text"
                            onClick={() => withdrawApplication(app)}
                            disabled={withdrawingId === app._id}
                          >
                            {withdrawingId === app._id ? 'Withdrawing…' : 'Withdraw'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="app-details-row">
                        <td colSpan={6}>
                          <div className="app-details">
                            <div>
                              <h4>Cover Letter</h4>
                              <p>{app.coverLetter || 'No cover letter provided.'}</p>
                            </div>
                            <div>
                              <h4>Method Statement / Execution Plan</h4>
                              <p>{app.methodStatement || (hasMethodDoc ? 'See attached methodology document.' : 'No execution plan provided.')}</p>
                            </div>
                            <div className="meta-grid">
                              <div>
                                <span className="muted small-text">Compliance Declaration</span>
                                <div>{app.complianceDeclaration ? 'Yes' : 'No'}</div>
                              </div>
                              <div>
                                <span className="muted small-text">Last Updated</span>
                                <div>{formatDate(app.updatedAt)}</div>
                              </div>
                              {tender?.deadline && (
                                <div>
                                  <span className="muted small-text">Tender Deadline</span>
                                  <div>{formatDate(tender.deadline)}</div>
                                </div>
                              )}
                              {hasMethodDoc && (
                                <div>
                                  <span className="muted small-text">Methodology Document</span>
                                  <div className="inline-actions">
                                    <button
                                      type="button"
                                      className="link-btn"
                                      onClick={() => previewMethodology(app)}
                                      disabled={previewingId === app._id}
                                    >
                                      {previewingId === app._id ? 'Opening…' : 'Preview PDF'}
                                    </button>
                                    <button
                                      type="button"
                                      className="link-btn"
                                      onClick={() => downloadMethodology(app)}
                                      disabled={downloadingId === app._id}
                                    >
                                      {downloadingId === app._id ? 'Downloading…' : 'Download PDF'}
                                    </button>
                                  </div>
                                  {app.methodDocumentName && (
                                    <span className="muted small-text">{app.methodDocumentName}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
      {previewData && (
        <div className="preview-overlay" role="dialog" aria-modal="true" onClick={closePreview}>
          <div className="preview-container" onClick={event => event.stopPropagation()}>
            <div className="preview-header">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{previewData.name}</h3>
              <button type="button" className="btn ghost" onClick={closePreview}>Close</button>
            </div>
            <div className="preview-body">
              <iframe src={previewData.url} title={previewData.name} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
