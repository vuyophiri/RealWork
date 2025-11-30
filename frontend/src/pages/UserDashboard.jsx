import React, { useEffect, useState } from 'react'
import api from '../api'

// User dashboard shows user's submitted applications
export default function UserDashboard(){
  const [apps, setApps] = useState([])
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  useEffect(() => {
    if (!user) return
    api.get(`/applications/user/${user.id}`).then(r => setApps(r.data)).catch(e => console.error(e))
  }, [user])

  return (
    <div>
      <h2>My Applications</h2>
      {apps.length === 0 && <p>No applications yet</p>}
      <div className="list">
        {apps.map(a => (
          <div key={a._id} className="card small">
            <h4>{a.tenderId?.title || '—'}</h4>
            <p className="muted">Status: {a.status}</p>
            <p>{a.coverLetter?.slice(0,120)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
