import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

// ViewApplications Component
// Admin page for reviewing and managing applications submitted for a specific tender.
// Allows administrators to view application details and update application status.
export default function ViewApplications(){
  // Extract tender ID from URL parameters
  const { id } = useParams() // tender id

  // State for storing applications data
  const [apps, setApps] = useState([])

  // Fetch applications for the current tender
  const fetch = () => api.get(`/applications/tender/${id}`).then(r => setApps(r.data)).catch(e => console.error(e))

  // Load applications when component mounts or tender ID changes
  useEffect(() => { fetch() }, [id])

  // Update application status (under-review, accepted, rejected)
  const updateStatus = (appId, status) => {
    api.put(`/applications/${appId}/status`, { status }).then(fetch).catch(e => console.error(e))
  }

  return (
    <div>
      {/* Page header */}
      <h2>Applications for Tender</h2>

      {/* Applications list container */}
      <div className="list">
        {apps.map(a => (
          <div key={a._id} className="card small">
            {/* Applicant information */}
            <h4>{a.userId?.name}</h4>
            <p className="muted">{a.userId?.email} • {new Date(a.createdAt).toLocaleString()}</p>

            {/* Cover letter preview (truncated to 200 characters) */}
            <p>{a.coverLetter?.slice(0,200)}</p>

            {/* Admin action buttons for status updates */}
            <div className="actions">
              <button className="btn small" onClick={() => updateStatus(a._id, 'under-review')}>Under review</button>
              <button className="btn small" onClick={() => updateStatus(a._id, 'accepted')}>Accept</button>
              <button className="btn small danger" onClick={() => updateStatus(a._id, 'rejected')}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
