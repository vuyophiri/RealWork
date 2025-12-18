import React, { useEffect, useState } from 'react'
import api from '../api'

// ManageTenders Component
// Comprehensive admin interface for creating, editing, deleting, and managing tenders.
// Includes form validation, status updates, and approval workflow for tender moderation.
export default function ManageTenders(){
  // State for storing all tenders data
  const [tenders, setTenders] = useState([])

  // Form state for creating/editing tenders with comprehensive fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    sector: '',
    location: '',
    deadline: '',
    requirements: '',
    requiredDocs: '',
    budgetMin: '',
    budgetMax: '',
    tags: '',
    professionalRequirements: '',
    minYearsExperience: '',
    minCompletedProjects: '',
    specialisedNotes: ''
  })

  // Track which tender is being edited (null for new tenders)
  const [editing, setEditing] = useState(null)

  // Get current user info for role-based permissions
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Fetch all tenders for management (admin endpoint)
  const fetch = () => api.get('/tenders/manage').then(r => setTenders(r.data)).catch(e => console.error(e))

  // Load tenders on component mount
  useEffect(() => { fetch() }, [])

  // All tenders are visible (filtering handled by API)
  const visibleTenders = tenders // API now handles filtering

  // Update tender approval status (approve/reject pending tenders)
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tenders/${id}/status`, { status })
      fetch() // Refresh the list after status change
    } catch (err) {
      console.error(err)
    }
  }

  // Handle form submission for creating or updating tenders
  const submit = async e => {
    e.preventDefault()
    try{
      // Prepare payload with proper data types and array parsing
      const payload = {
        ...form,
        requiredDocs: form.requiredDocs ? form.requiredDocs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [],
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        tags: form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        professionalRequirements: form.professionalRequirements ? form.professionalRequirements.split(',').map(req => req.trim()).filter(Boolean) : [],
        minYearsExperience: form.minYearsExperience ? Number(form.minYearsExperience) : undefined,
        minCompletedProjects: form.minCompletedProjects ? Number(form.minCompletedProjects) : undefined,
        specialisedNotes: form.specialisedNotes || undefined
      }

      // Update existing tender or create new one
      if (editing) await api.put(`/tenders/${editing}`, payload)
      else await api.post('/tenders', payload)

      // Reset form and refresh tenders list
      setForm({ title: '', description: '', category: '', sector: '', location: '', deadline: '', requirements: '', requiredDocs: '', budgetMin: '', budgetMax: '', tags: '', professionalRequirements: '', minYearsExperience: '', minCompletedProjects: '', specialisedNotes: '' })
      setEditing(null)
      fetch()
    }catch(err){ console.error(err) }
  }

  // Populate form with tender data for editing
  const edit = t => {
    setEditing(t._id)
    setForm({
      title: t.title,
      description: t.description,
      category: t.category,
      sector: t.sector || '',
      location: t.location || '',
      deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0,10) : '',
      requirements: t.requirements || '',
      requiredDocs: (t.requiredDocs || []).join(', '),
      budgetMin: t.budgetMin != null ? t.budgetMin : '',
      budgetMax: t.budgetMax != null ? t.budgetMax : '',
      tags: (t.tags || []).join(', '),
      professionalRequirements: (t.professionalRequirements || []).join(', '),
      minYearsExperience: t.minYearsExperience != null ? t.minYearsExperience : '',
      minCompletedProjects: t.minCompletedProjects != null ? t.minCompletedProjects : '',
      specialisedNotes: t.specialisedNotes || ''
    })
  }

  // Delete a tender
  const remove = id => api.delete(`/tenders/${id}`).then(fetch).catch(e => console.error(e))

  return (
    <div>
      {/* Page header */}
      <h2>Manage Tenders</h2>

      {/* Two-column layout: form on left, tender list on right */}
      <div className="grid">
        {/* Tender creation/editing form */}
        <div className="card form-card">
            <h3>{editing ? 'Edit Tender' : 'New Tender'}</h3>
          <form onSubmit={submit}>
            {/* Basic tender information */}
            <label>Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

            <label>Category</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />

            <label>Sector</label>
            <input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />

            <label>Location</label>
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />

            <label>Deadline</label>
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />

            {/* Budget range inputs */}
            <div className="grid two-col">
              <div>
                <label>Budget minimum (R)</label>
                <input type="number" value={form.budgetMin} onChange={e => setForm({ ...form, budgetMin: e.target.value })} />
              </div>
              <div>
                <label>Budget maximum (R)</label>
                <input type="number" value={form.budgetMax} onChange={e => setForm({ ...form, budgetMax: e.target.value })} />
              </div>
            </div>

            {/* Detailed descriptions and requirements */}
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            <label>Requirements</label>
            <textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />

            {/* Document and qualification requirements */}
            <label>Required Documents (comma separated, e.g. cipc,bbbee,csd)</label>
            <input value={form.requiredDocs} onChange={e => setForm({ ...form, requiredDocs: e.target.value })} />

            <label>Tags (comma separated)</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />

            <label>Professional Registrations Required (comma separated, e.g. ECSA,SACPLAN)</label>
            <input value={form.professionalRequirements} onChange={e => setForm({ ...form, professionalRequirements: e.target.value })} />

            {/* Experience requirements */}
            <div className="grid two-col">
              <div>
                <label>Minimum Years Experience</label>
                <input type="number" value={form.minYearsExperience} onChange={e => setForm({ ...form, minYearsExperience: e.target.value })} />
              </div>
              <div>
                <label>Minimum Similar Projects Completed</label>
                <input type="number" value={form.minCompletedProjects} onChange={e => setForm({ ...form, minCompletedProjects: e.target.value })} />
              </div>
            </div>

            {/* Additional notes for bidders */}
            <label>Specialised Notes (displayed to bidders)</label>
            <textarea value={form.specialisedNotes} onChange={e => setForm({ ...form, specialisedNotes: e.target.value })} />

            {/* Submit button */}
            <button className="btn" type="submit">{editing ? 'Save' : 'Create'}</button>
          </form>
        </div>

        {/* Existing tenders list */}
        <div>
          <h3>Existing</h3>
          <div className="list">
            {visibleTenders.map(t => (
              <div key={t._id} className="card small">
                {/* Tender header with title and status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4>{t.title}</h4>
                  <span className={`badge ${t.status === 'approved' ? 'success' : t.status === 'rejected' ? 'danger' : 'warning'}`}>
                    {t.status || 'pending'}
                  </span>
                </div>

                {/* Tender metadata */}
                <p className="muted">{t.sector || t.category} • {t.location || 'N/A'}</p>

                {/* Budget information */}
                {(t.budgetMin != null || t.budgetMax != null) && <p className="muted">Budget: {t.budgetMin != null ? `R${t.budgetMin.toLocaleString()}` : '—'} - {t.budgetMax != null ? `R${t.budgetMax.toLocaleString()}` : '—'}</p>}

                {/* Requirements summary */}
                {(t.minYearsExperience != null || (t.professionalRequirements || []).length) && (
                  <p className="muted">Req: {t.minYearsExperience != null ? `${t.minYearsExperience}+ yrs` : '—'} • {t.minCompletedProjects != null ? `${t.minCompletedProjects}+ projects` : '—'} • {(t.professionalRequirements || []).join(', ') || 'No prof. reqs'}</p>
                )}

                {/* Action buttons */}
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn small" onClick={() => edit(t)}>Edit</button>
                  <button className="btn small danger" onClick={() => remove(t._id)}>Delete</button>
                  <a className="btn small" href={`/admin/tenders/${t._id}/applications`}>Applications</a>

                  {/* Admin approval/rejection buttons for pending tenders */}
                  {user.role === 'admin' && t.status === 'pending' && (
                    <>
                      <button className="btn small success" onClick={() => updateStatus(t._id, 'approved')}>Approve</button>
                      <button className="btn small danger" onClick={() => updateStatus(t._id, 'rejected')}>Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
