// TenderDashboard Component
// Displays a list of tenders with filtering, sorting, and qualification checking
// Supports both public view and personalized recommendations for logged-in users

import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { Link } from 'react-router-dom'

// Deadline filter options for the UI
const DEADLINE_WINDOWS = [
  { label: 'Any deadline', value: 'any' },
  { label: 'Due within 7 days', value: '7' },
  { label: 'Due within 30 days', value: '30' },
  { label: 'Due after 30 days', value: 'future' }
]

// Helper function to format budget display
const formatBudget = (min, max) => {
  if (min == null && max == null) return null
  if (min != null && max != null) return `Budget: R${min.toLocaleString()} - R${max.toLocaleString()}`
  if (min != null) return `Budget: From R${min.toLocaleString()}`
  if (max != null) return `Budget: Up to R${max.toLocaleString()}`
  return null
}

export default function TenderDashboard() {
  // State for tenders data and UI
  const [tenders, setTenders] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [filters, setFilters] = useState({ category: '', sector: '', minBudget: '', maxBudget: '', deadline: 'any' })
  const [sort, setSort] = useState('deadline-asc')
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [profile, setProfile] = useState(null)
  const [categories, setCategories] = useState([])
  const [sectors, setSectors] = useState([])
  const [view, setView] = useState('all')
  const token = localStorage.getItem('token')

  // Update category and sector filter options based on available tenders
  const updateCategoryCache = (data) => {
    setCategories(prev => {
      const next = new Set(prev)
      data.forEach(t => { if (t.category) next.add(t.category) })
      return Array.from(next).sort()
    })
    setSectors(prev => {
      const next = new Set(prev)
      data.forEach(t => { if (t.sector) next.add(t.sector) })
      return Array.from(next).sort()
    })
  }

  // Load tenders from API with current filters and sorting
  const loadTenders = async () => {
    setLoading(true)
    try {
      const params = { sort }
      if (filters.category) params.category = filters.category
      if (filters.sector) params.sector = filters.sector
      if (filters.minBudget) params.minBudget = filters.minBudget
      if (filters.maxBudget) params.maxBudget = filters.maxBudget
      const now = new Date()
      if (filters.deadline === '7') {
        params.deadlineBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        params.deadlineAfter = now.toISOString()
      } else if (filters.deadline === '30') {
        params.deadlineBefore = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        params.deadlineAfter = now.toISOString()
      } else if (filters.deadline === 'future') {
        params.deadlineAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
      const res = await api.get('/tenders', { params })
      setTenders(res.data)
      updateCategoryCache(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load tenders when filters or sort changes (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      loadTenders()
    }, 250)
    return () => clearTimeout(handle)
  }, [filters, sort])

  // Load user profile if logged in
  useEffect(() => {
    if (!token) return
    api.get('/vendors/me').then(r => setProfile(r.data)).catch(() => setProfile(null))
  }, [token])

  // Load personalized tender suggestions if logged in
  useEffect(() => {
    if (!token) {
      setSuggestions([])
      return
    }
    setLoadingSuggestions(true)
    api.get('/tenders/suggestions')
      .then(res => setSuggestions(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoadingSuggestions(false))
  }, [token])

  // Computed values from user profile for qualification checking
  const docs = useMemo(() => (profile?.documents || []).map(doc => (doc.type || '').toLowerCase()), [profile])
  const registrations = useMemo(() => new Set((profile?.professionalRegistrations || []).map(reg => (reg.body || '').toLowerCase())), [profile])
  const yearsExperience = Number(profile?.yearsExperience || 0)
  const completedProjects = Number(profile?.completedProjects || 0)
  const isProfileVerified = profile?.status === 'verified'
  const hasProfile = Boolean(profile)

  const displayedTenders = view === 'suggested' ? suggestions : tenders

  // Reset all filters to default values
  const resetFilters = () => {
    setFilters({ category: '', sector: '', minBudget: '', maxBudget: '', deadline: 'any' })
    setSort('deadline-asc')
  }

  return (
    <div className="tender-dashboard">
      {/* Header with title and view toggle buttons */}
      <div className="top-row">
        <h2>Open Tenders</h2>
        <div className="badge-group">
          <button className={`badge-toggle ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>All</button>
          {token && <button className={`badge-toggle ${view === 'suggested' ? 'active' : ''}`} onClick={() => setView('suggested')}>Recommended</button>}
        </div>
      </div>

      {/* Filter controls for category, sector, budget, deadline, and sorting */}
      <div className="filters">
        <div>
          <label>Category</label>
          <select value={filters.category} onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}>
            <option value="">All categories</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div>
          <label>Sector</label>
          <select value={filters.sector} onChange={e => setFilters(prev => ({ ...prev, sector: e.target.value }))}>
            <option value="">All sectors</option>
            {sectors.map(sector => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </div>
        <div>
          <label>Min budget (R)</label>
          <input type="number" value={filters.minBudget} onChange={e => setFilters(prev => ({ ...prev, minBudget: e.target.value }))} />
        </div>
        <div>
          <label>Max budget (R)</label>
          <input type="number" value={filters.maxBudget} onChange={e => setFilters(prev => ({ ...prev, maxBudget: e.target.value }))} />
        </div>
        <div>
          <label>Deadline</label>
          <select value={filters.deadline} onChange={e => setFilters(prev => ({ ...prev, deadline: e.target.value }))}>
            {DEADLINE_WINDOWS.map(window => <option key={window.value} value={window.value}>{window.label}</option>)}
          </select>
        </div>
        <div>
          <label>Sort by</label>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="deadline-asc">Deadline (soonest)</option>
            <option value="deadline-desc">Deadline (latest)</option>
            <option value="budget-asc">Budget (lowest)</option>
            <option value="budget-desc">Budget (highest)</option>
            <option value="newest">Recently published</option>
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn ghost" type="button" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* Results summary and loading indicator */}
      <div className="top-row" style={{ marginTop: 16 }}>
        <p className="muted">Showing {displayedTenders.length} {view === 'suggested' ? 'suggested' : 'matching'} tenders</p>
        {view === 'suggested' && (
          <span className="badge muted">{loadingSuggestions ? 'Updating suggestions...' : 'Personalised for you'}</span>
        )}
      </div>

      {/* Loading state or tender grid */}
      {loading ? (
        <p>Loading tenders...</p>
      ) : (
        <div className="grid">
          {displayedTenders.map(tender => {
            // Check qualification requirements against user profile
            const requiredDocs = tender.requiredDocs || []
            const missingDocs = requiredDocs.filter(doc => !docs.includes((doc || '').toLowerCase()))
            const requiredRegistrations = tender.professionalRequirements || []
            const missingRegistrationBodies = requiredRegistrations.filter(req => !registrations.has((req || '').toLowerCase()))
            const experienceShortfalls = []
            if (profile && tender.minYearsExperience != null && yearsExperience < tender.minYearsExperience) {
              experienceShortfalls.push(`Experience: need ${tender.minYearsExperience}+ years`)
            }
            if (profile && tender.minCompletedProjects != null && completedProjects < tender.minCompletedProjects) {
              experienceShortfalls.push(`Projects: need ${tender.minCompletedProjects}+ similar`)
            }
            const qualificationWarnings = []
            if (missingDocs.length) qualificationWarnings.push(`Documents: ${missingDocs.map(doc => doc.toUpperCase()).join(', ')}`)
            if (missingRegistrationBodies.length) qualificationWarnings.push(`Registrations: ${missingRegistrationBodies.join(', ')}`)
            qualificationWarnings.push(...experienceShortfalls)
            const qualifies = profile ? qualificationWarnings.length === 0 : null
            const profileActionLabel = !hasProfile
              ? 'Create Profile'
              : !isProfileVerified
                ? 'Finish Verification'
                : missingDocs.length || missingRegistrationBodies.length || experienceShortfalls.length
                  ? 'Update Documents'
                  : 'Review Profile'
            const budgetLabel = formatBudget(tender.budgetMin, tender.budgetMax)
            return (
              <div key={tender._id} className="card">
                {/* Tender header with title, metadata, and requirement tags */}
                <div className="card-heading">
                  <div>
                    <h3>{tender.title}</h3>
                    <p className="muted">{tender.sector || tender.category || 'General'} • {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'No deadline'}</p>
                    {budgetLabel && <p className="muted">{budgetLabel}</p>}
                    {(tender.minYearsExperience != null || tender.minCompletedProjects != null) && (
                      <p className="muted">Experience: {tender.minYearsExperience != null ? `${tender.minYearsExperience}+ yrs` : '—'} • {tender.minCompletedProjects != null ? `${tender.minCompletedProjects}+ projects` : '—'}</p>
                    )}
                    {tender.specialisedNotes && <p className="muted">{tender.specialisedNotes}</p>}
                  </div>
                  <div className="tag-stack">
                    {requiredDocs.map(doc => <span key={doc} className="tag">{doc.toUpperCase()}</span>)}
                    {requiredRegistrations.map(req => <span key={req} className="tag accent">{req}</span>)}
                  </div>
                </div>
                {/* Tender description */}
                <p style={{ marginTop: 12 }}>{tender.description?.slice(0, 220)}{tender.description && tender.description.length > 220 ? '...' : ''}</p>
                {/* Qualification status and warnings */}
                {qualifies !== null && (
                  <div className="qualification-block">
                    <p className="muted">Qualification: {qualifies ? <span className="success">Ready to apply</span> : <span className="warning">Action required</span>}</p>
                    {!qualifies && qualificationWarnings.length > 0 && (
                      <ul className="muted-list">
                        {qualificationWarnings.map(line => <li key={line}>{line}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                {/* Action buttons */}
                <div className="actions" style={{ marginTop: 12 }}>
                  <Link to={`/tenders/${tender._id}`} className="btn ghost small">Details</Link>
                  {token ? (
                    qualifies ? (
                      <Link to={`/apply/${tender._id}`} className="btn small">Apply</Link>
                    ) : (
                      <Link to="/vendor" className="btn small ghost">{profileActionLabel}</Link>
                    )
                  ) : (
                    <Link to="/login" className="btn small">Login to Apply</Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state for suggested view when no personalized tenders */}
      {view === 'suggested' && !loading && !loadingSuggestions && !displayedTenders.length && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3>No personalised tenders yet</h3>
          <p className="muted">Apply to tenders or complete your vendor profile so we can learn your preferences.</p>
        </div>
      )}
    </div>
  )
}