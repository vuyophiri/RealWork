import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

// TenderDetails Component
// Displays comprehensive tender information and qualification status.
// Performs complex qualification checking against user profile including
// document verification, professional registrations, CIDB grading, and text analysis.
export default function TenderDetails(){
  // Extract tender ID from URL parameters
  const { id } = useParams()

  // State for tender data
  const [tender, setTender] = useState(null)

  // State for qualification assessment results
  const [qualify, setQualify] = useState(null)

  // State for detailed requirements status breakdown
  const [requirementsStatus, setRequirementsStatus] = useState([])

  // Fetch tender details on component mount
  useEffect(() => {
    api.get(`/tenders/${id}`).then(r => setTender(r.data)).catch(e => console.error(e))
  }, [id])

  // Complex qualification checking logic - runs when tender data is available
  useEffect(() => {
    const check = async () => {
      if (!tender) return

      // Fetch user profile if authenticated
      let profile = null
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const res = await api.get('/vendors/me')
          profile = res.data
        } catch (e) {
          console.error(e)
        }
      }

      // Helper function to normalize strings for comparison
      const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

      // Extract normalized document types from user profile
      const docs = profile ? (profile.documents || []).map(d => normalize(d.type)) : []

      // Extract professional registration bodies
      const userRegs = profile ? (profile.professionalRegistrations || []) : []
      const userBodies = userRegs.map(r => (r.body || '').toLowerCase())

      // Find CIDB registration specifically
      const userCidb = userRegs.find(r => (r.body || '').toLowerCase() === 'cidb')

      // Helper to check if user has a specific document
      const hasDocument = (candidate) => docs.some(docValue => docValue === candidate || docValue.includes(candidate) || candidate.includes(docValue))

      // Helper to check if user has registration with a professional body
      const hasProfessionalBody = (candidate) => userBodies.some(body => body === candidate || body.includes(candidate) || candidate.includes(body))

      // Parse CIDB grade string (e.g., "7GB" -> { level: 7, type: "GB" })
      const parseCidb = (value) => {
        const match = (value || '').match(/(\d+)\s*([a-zA-Z]+)/)
        if (!match) return { level: 0, type: '' }
        return { level: parseInt(match[1], 10), type: match[2].toUpperCase().replace(/[^A-Z]/g, '') }
      }

      // Evaluate CIDB qualification against required grade
      const evaluateCidb = (requiredGrade) => {
        if (!profile) return { met: null, note: '' }
        if (!userCidb) return { met: false, note: 'No CIDB registration found' }

        const required = parseCidb(requiredGrade)
        const user = parseCidb(userCidb.grade)

        if (!required.level) return { met: true, note: '' }
        if (!user.level) return { met: false, note: 'CIDB grade is missing or invalid' }

        if (user.level >= required.level) {
          if (!required.type || !user.type || user.type === required.type) {
            return { met: true, note: '' }
          }
          return { met: true, note: `Different class (${userCidb.grade || 'unknown'} vs required ${requiredGrade})` }
        }

        return { met: false, note: `You have ${userCidb.grade || 'invalid grade'}` }
      }

      // Data structures for tracking requirement status
      const statusOrder = [] // Maintains order of requirements
      const statusMap = new Map() // Maps requirement keys to status objects

      // Helper to merge status updates for requirements
      const mergeStatus = (key, payload) => {
        if (!statusMap.has(key)) statusOrder.push(key)
        statusMap.set(key, { ...(statusMap.get(key) || {}), ...payload })
      }

      // Convert document keys to user-friendly names
      const friendlyDocName = (docKey, rawValue) => {
        const lookup = {
          bbbee: 'B-BBEE Certificate',
          bee: 'B-BBEE Certificate',
          cipc: 'CIPC Document',
          csd: 'CSD Report',
          taxclearance: 'Tax Clearance Certificate',
          tax: 'Tax Clearance Certificate',
          sars: 'SARS Tax PIN',
          coida: 'COIDA Letter'
        }
        if (lookup[docKey]) return lookup[docKey]
        const source = (rawValue || docKey).replace(/[_-]/g, ' ')
        return source.replace(/\b\w/g, c => c.toUpperCase())
      }

      // Process explicit document requirements
      const docRequirements = Array.isArray(tender.requiredDocs)
        ? tender.requiredDocs
        : (tender.requiredDocs ? [tender.requiredDocs] : [])

      docRequirements.forEach(doc => {
        const normalizedDoc = normalize(doc)
        const key = `doc-${normalizedDoc}`
        mergeStatus(key, {
          name: friendlyDocName(normalizedDoc, doc),
          met: profile ? hasDocument(normalizedDoc) : null,
          type: 'document'
        })
      })

      // Process professional registration requirements
      ;(tender.professionalRequirements || []).forEach(req => {
        const key = `prof-${normalize(req)}`
        mergeStatus(key, {
          name: req,
          met: profile ? hasProfessionalBody(req.toLowerCase()) : null,
          type: 'professional'
        })
      })

      // Process CIDB grade requirements
      if (tender.cidbGrade) {
        const cidbResult = evaluateCidb(tender.cidbGrade)
        mergeStatus('cidb', {
          name: `CIDB Grade ${tender.cidbGrade}`,
          met: profile ? cidbResult.met : null,
          note: profile ? cidbResult.note : '',
          type: 'cidb'
        })
      }

      // Process text-based requirements from description
      const rawRequirements = typeof tender.requirements === 'string' ? tender.requirements : ''
      const textItems = rawRequirements
        .replace(/\u2022/g, '\n') // Convert bullet points to newlines
        .split(/\r?\n/) // Split into lines
        .map(item => item.replace(/^[\-\*\u2022]\s*/, '').trim()) // Remove bullet markers
        .filter(Boolean) // Remove empty items

      // Keyword mappings for automatic requirement detection
      const docKeywordMap = [
        { token: 'bbbee', key: 'bbbee' },
        { token: 'b-bbee', key: 'bbbee' },
        { token: 'bee certificate', key: 'bbbee' },
        { token: 'cipc', key: 'cipc' },
        { token: 'company registration', key: 'cipc' },
        { token: 'csd', key: 'csd' },
        { token: 'tax clearance', key: 'taxclearance' },
        { token: 'sars', key: 'taxclearance' },
        { token: 'coida', key: 'coida' }
      ]

      const profKeywordMap = [
        { token: 'ecsa', key: 'ecsa' },
        { token: 'sacpcmp', key: 'sacpcmp' },
        { token: 'sacap', key: 'sacap' },
        { token: 'saps', key: 'saps' }
      ]

      // Analyze each text requirement item
      textItems.forEach((item, index) => {
        const lower = item.toLowerCase()
        let handled = false

        // Check for CIDB requirements in text
        if (lower.includes('cidb')) {
          const parsed = parseCidb(item)
          const requiredGrade = parsed.level ? `${parsed.level}${parsed.type}` : tender.cidbGrade
          const cidbResult = evaluateCidb(requiredGrade || tender.cidbGrade || item)
          mergeStatus('cidb', {
            name: item,
            met: profile ? cidbResult.met : null,
            note: profile ? cidbResult.note : '',
            type: 'cidb'
          })
          handled = true
        }

        // Check for document keywords
        if (!handled) {
          const docMatch = docKeywordMap.find(d => lower.includes(d.token))
          if (docMatch) {
            const key = `doc-${docMatch.key}`
            mergeStatus(key, {
              name: item,
              met: profile ? hasDocument(docMatch.key) : null,
              type: 'document'
            })
            handled = true
          }
        }

        // Check for professional registration keywords
        if (!handled) {
          const profMatch = profKeywordMap.find(p => lower.includes(p.token))
          if (profMatch) {
            const key = `prof-${profMatch.key}`
            mergeStatus(key, {
              name: item,
              met: profile ? hasProfessionalBody(profMatch.key) : null,
              type: 'professional'
            })
            handled = true
          }
        }

        // Fallback for unrecognized requirements
        if (!handled) {
          const key = `text-${index}`
          mergeStatus(key, {
            name: item,
            met: null, // Cannot automatically verify
            type: 'text'
          })
        }
      })

      // Convert status map to ordered array
      const statusList = statusOrder.map(key => statusMap.get(key)).filter(Boolean)
      setRequirementsStatus(statusList)

      // Calculate overall qualification status
      if (profile) {
        const actionable = statusList.filter(s => s.met !== null) // Requirements that can be checked
        if (actionable.length === 0) {
          setQualify(null) // No checkable requirements
        } else {
          const qualifies = actionable.every(s => s.met) // All requirements met
          const missing = actionable.filter(s => !s.met).map(s => s.name) // List of unmet requirements
          setQualify({ qualifies, missing })
        }
      } else {
        setQualify(null) // No profile to check against
      }
    }
    check()
  }, [id, tender])

  // Loading state
  if (!tender) return <p>Loading...</p>

  return (
    <div className="card">
      {/* Tender header with title, category, deadline, and qualification status */}
      <div className="top-row">
        <div>
          <h2 style={{ margin: 0 }}>{tender.title}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{tender.category} • {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'No deadline'}</p>
        </div>
        <div className="tender-meta-tags">
          {/* Document requirement tags */}
          {(tender.requiredDocs || []).map(d => <span className="tag" key={d}>{d.toUpperCase()}</span>)}

          {/* Qualification status badge */}
          <div style={{ marginTop: 6 }}>
            {qualify && (qualify.qualifies ? <span className="badge" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>Qualified</span> : <span className="badge" style={{ background: 'rgba(249,115,22,0.08)', color: '#ea580c' }}>Not Qualified</span>)}
          </div>
        </div>
      </div>

      {/* Tender metadata cards */}
      <div style={{ marginTop: 12 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {tender.cidbGrade && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>CIDB Grade</span>
              <div style={{ fontWeight: '600' }}>{tender.cidbGrade}</div>
            </div>
          )}
          {tender.contractDuration && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Duration</span>
              <div style={{ fontWeight: '600' }}>{tender.contractDuration}</div>
            </div>
          )}
          {tender.siteInspectionDate && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Site Inspection</span>
              <div style={{ fontWeight: '600' }}>
                {new Date(tender.siteInspectionDate).toLocaleDateString()}
                {tender.siteInspectionMandatory && <span className="tag warning" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>Mandatory</span>}
              </div>
            </div>
          )}
        </div>

        {/* Tender description */}
        <p>{tender.description}</p>

        {/* Requirements section with detailed status table */}
        <h4>Requirements</h4>
        {requirementsStatus.length > 0 ? (
          <table className="requirements-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requirementsStatus.map((req, i) => (
                <tr key={i}>
                  <td>
                    {req.name}
                    {/* Additional notes for complex requirements */}
                    {req.note && <div className="error-text" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{req.note}</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {/* Status indicators: ✅ met, ❌ not met, - unknown */}
                    {req.met === null ? <span className="muted">-</span> : <span className="status-icon">{req.met ? '✅' : '❌'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>{tender.requirements || 'No requirements captured for this tender.'}</p>
        )}

        {/* Evaluation criteria if available */}
        {tender.evaluationCriteria && tender.evaluationCriteria.length > 0 && (
          <>
            <h4>Evaluation Criteria</h4>
            <ul className="muted-list">
              {tender.evaluationCriteria.map((c, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '400px' }}>
                  <span>{c.criterion}</span>
                  <span className="tag">{c.weight}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="actions" style={{ marginTop: 12 }}>
        {/* Apply button - disabled if not qualified */}
        <Link to={`/apply/${tender._id}`} className={`btn ${qualify && !qualify.qualifies ? 'disabled' : ''}`}>Apply</Link>
        <Link to="/" className="btn ghost">Back</Link>
      </div>
    </div>
  )
}
