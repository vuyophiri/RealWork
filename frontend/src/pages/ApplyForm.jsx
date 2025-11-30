import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

// Simple application form that posts cover letter and optional document links
export default function ApplyForm(){
  const { id } = useParams()
  const [formData, setFormData] = useState({
    coverLetter: '',
    proposedAmount: '',
    durationWeeks: '',
    methodStatement: '',
    complianceDeclaration: false
  })
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    // check if user has a verified vendor profile; if not, block and ask to complete profile
    const check = async () => {
      try{
        const res = await api.get('/vendors/me')
        const profile = res.data
        if (!profile || profile.status !== 'verified') setBlocked(true)
      }catch(err){ setBlocked(true) }
    }
    check()
  }, [])

  const submit = async e => {
    e.preventDefault(); setError('')
    if (!formData.coverLetter) return setError('Please include a short cover letter')
    if (!formData.proposedAmount) return setError('Please enter your proposed bid amount')
    if (!formData.durationWeeks) return setError('Please enter the estimated duration')
    if (!formData.complianceDeclaration) return setError('You must declare compliance to proceed')

    try{
      await api.post('/applications', { tenderId: id, ...formData })
      navigate('/dashboard')
    }catch(err){
      setError(err.response?.data?.message || 'Failed to submit')
    }
  }

  return (
    <div className="card form-card">
      <h2>Submit Bid Application</h2>
      {error && <p className="error">{error}</p>}
      {blocked && <p className="error">You must complete and verify your Business Profile before applying. <a href="/vendor">Go to Business Profile</a></p>}
      <form onSubmit={submit}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label>Proposed Bid Amount (R)</label>
            <input 
              type="number" 
              value={formData.proposedAmount} 
              onChange={e => setFormData({...formData, proposedAmount: e.target.value})} 
              placeholder="0.00"
              min="0"
            />
          </div>
          <div>
            <label>Estimated Duration (Weeks)</label>
            <input 
              type="number" 
              value={formData.durationWeeks} 
              onChange={e => setFormData({...formData, durationWeeks: e.target.value})} 
              placeholder="e.g. 12"
              min="1"
            />
          </div>
        </div>

        <label>Method Statement / Execution Plan</label>
        <p className="muted" style={{ marginTop: '-10px', marginBottom: '8px' }}>Briefly describe how you intend to execute this project.</p>
        <textarea 
          value={formData.methodStatement} 
          onChange={e => setFormData({...formData, methodStatement: e.target.value})} 
          placeholder="Outline your approach, key milestones, and resource allocation..."
        />

        <label>Cover Letter</label>
        <textarea 
          value={formData.coverLetter} 
          onChange={e => setFormData({...formData, coverLetter: e.target.value})} 
          placeholder="Introduce your company and summarize why you are the best fit..."
        />

        <div style={{ margin: '16px 0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <input 
            type="checkbox" 
            id="compliance" 
            style={{ width: 'auto', marginTop: '4px' }}
            checked={formData.complianceDeclaration}
            onChange={e => setFormData({...formData, complianceDeclaration: e.target.checked})}
          />
          <label htmlFor="compliance" style={{ fontWeight: 'normal', margin: 0 }}>
            I hereby declare that my company meets all the specific eligibility criteria for this tender, including CIDB grading, tax compliance, and B-BBEE requirements. I understand that false declarations will lead to immediate disqualification.
          </label>
        </div>

        <button className="btn" type="submit" disabled={blocked}>Submit Application</button>
      </form>
    </div>
  )
}
