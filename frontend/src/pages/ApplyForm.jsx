// Apply Form Page
// Form for vendors to submit tender applications with commercial details,
// technical responses, and compliance declarations

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

export default function ApplyForm(){
  // Get tender ID from URL and navigation function
  const { id } = useParams()
  const navigate = useNavigate()

  // Form state with all application fields
  const [formData, setFormData] = useState({
    coverLetter: '',
    proposedAmount: '',
    durationWeeks: '',
    methodStatement: '',
    complianceDeclaration: false,
    methodDocument: null
  })
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)

  // Check if user has verified vendor profile before allowing application
  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get('/vendors/me')
        if (!res.data || res.data.status !== 'verified') setBlocked(true)
      } catch {
        setBlocked(true)
      }
    }
    check()
  }, [])

  // Handle form submission with validation and file upload
  const submit = async (e) => {
    e.preventDefault()
    setError('')

    // Form validation
    if (!formData.proposedAmount) return setError('Please enter your proposed bid amount')
    if (!formData.durationWeeks) return setError('Please enter the estimated duration in weeks')
    if (!formData.methodStatement && !formData.methodDocument) return setError('Provide a text summary or upload your methodology PDF')
    if (!formData.coverLetter) return setError('Please include a cover letter')
    if (!formData.complianceDeclaration) return setError('You must declare compliance to proceed')

    try {
      // Prepare multipart form data for submission
      const payload = new FormData()
      payload.append('tenderId', id)
      payload.append('coverLetter', formData.coverLetter)
      payload.append('proposedAmount', formData.proposedAmount)
      payload.append('durationWeeks', formData.durationWeeks)
      payload.append('methodStatement', formData.methodStatement)
      payload.append('complianceDeclaration', formData.complianceDeclaration)
      if (formData.methodDocument) {
        payload.append('methodDocument', formData.methodDocument)
      }

      // Submit application and redirect to dashboard
      await api.post('/applications', payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit your application')
    }
  }

  return (
    <div className="card form-card">
      {/* Form header with title and description */}
      <div className="form-header">
        <h2>Submit Bid Application</h2>
        <p className="muted">Complete the details below to lodge your bid for this tender.</p>
      </div>

      {/* Error message display */}
      {error && <p className="error">{error}</p>}

      {/* Warning for unverified vendor profiles */}
      {blocked && (
        <p className="warning-strip">
          You must complete and verify your Business Profile before applying. <a href="/vendor">Go to Business Profile</a>
        </p>
      )}

      {/* Application form with multiple sections */}
      <form onSubmit={submit} className="form-stack">
        {/* Commercial details section */}
        <section className="form-section">
          <h3>Commercial Details</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="proposedAmount">Proposed Bid Amount (R)</label>
              <input
                id="proposedAmount"
                type="number"
                min="0"
                placeholder="0.00"
                value={formData.proposedAmount}
                onChange={(e) => setFormData({ ...formData, proposedAmount: e.target.value })}
              />
              <span className="helper-text">Enter the full project amount including VAT if applicable.</span>
            </div>
            <div className="form-field">
              <label htmlFor="durationWeeks">Estimated Duration (Weeks)</label>
              <input
                id="durationWeeks"
                type="number"
                min="1"
                placeholder="e.g. 12"
                value={formData.durationWeeks}
                onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })}
              />
              <span className="helper-text">Provide the total number of weeks to deliver the scope.</span>
            </div>
          </div>
        </section>

        {/* Technical response section with method statement and file upload */}
        <section className="form-section">
          <h3>Technical Response</h3>
          <div className="form-field">
            <label htmlFor="methodStatement">Method Statement / Execution Plan</label>
            <span className="helper-text">Outline your approach, key milestones, resources, and risk controls. You can also upload a detailed methodology PDF.</span>
            <textarea
              id="methodStatement"
              rows={6}
              placeholder="Describe how you will deliver the works..."
              value={formData.methodStatement}
              onChange={(e) => setFormData({ ...formData, methodStatement: e.target.value })}
            />
            {/* File upload for methodology document */}
            <div className="file-uploader">
              <label htmlFor="methodDocument" className="file-label">
                {formData.methodDocument ? formData.methodDocument.name : 'Attach detailed methodology (PDF, optional)'}
              </label>
              <input
                id="methodDocument"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFormData({ ...formData, methodDocument: e.target.files?.[0] || null })}
              />
              <span className="helper-text">Maximum size 10MB. Uploads replace the text summary if provided.</span>
              {formData.methodDocument && (
                <button
                  type="button"
                  className="remove-file"
                  onClick={() => setFormData({ ...formData, methodDocument: null })}
                >
                  Remove file
                </button>
              )}
            </div>
          </div>
          {/* Cover letter field */}
          <div className="form-field">
            <label htmlFor="coverLetter">Cover Letter</label>
            <span className="helper-text">Summarize your team, experience, and readiness to mobilize.</span>
            <textarea
              id="coverLetter"
              rows={5}
              placeholder="Introduce your company and highlight relevant experience..."
              value={formData.coverLetter}
              onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
            />
          </div>
        </section>

        {/* Compliance declaration section */}
        <section className="form-section">
          <h3>Declarations</h3>
          <label className="checkbox-field" htmlFor="compliance">
            <input
              id="compliance"
              type="checkbox"
              checked={formData.complianceDeclaration}
              onChange={(e) => setFormData({ ...formData, complianceDeclaration: e.target.checked })}
            />
            <span>
              I hereby declare that my company meets all the specific eligibility criteria for this tender, including CIDB grading,
              tax compliance, and B-BBEE requirements. I understand that false declarations will lead to immediate disqualification.
            </span>
          </label>
        </section>

        {/* Form submission actions */}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={blocked}>Submit Application</button>
        </div>
      </form>
    </div>
  )
}
