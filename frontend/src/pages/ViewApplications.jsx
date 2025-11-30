import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

// Admin page to view applications for a tender and update status
export default function ViewApplications(){
  const { id } = useParams() // tender id
  const [apps, setApps] = useState([])

  const fetch = () => api.get(`/applications/tender/${id}`).then(r => setApps(r.data)).catch(e => console.error(e))
  useEffect(() => { fetch() }, [id])

  const updateStatus = (appId, status) => {
    api.put(`/applications/${appId}/status`, { status }).then(fetch).catch(e => console.error(e))
  }

  return (
    <div>
      <h2>Applications for Tender</h2>
      <div className="list">
        {apps.map(a => (
          <div key={a._id} className="card small">
            <h4>{a.userId?.name}</h4>
            <p className="muted">{a.userId?.email} • {new Date(a.createdAt).toLocaleString()}</p>
            <p>{a.coverLetter?.slice(0,200)}</p>
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
