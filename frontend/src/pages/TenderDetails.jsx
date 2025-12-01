import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

// Shows details for a tender and offers an Apply button
export default function TenderDetails(){
  const { id } = useParams()
  const [tender, setTender] = useState(null)
  const [qualify, setQualify] = useState(null)
  const [requirementsStatus, setRequirementsStatus] = useState([])

  useEffect(() => {
    api.get(`/tenders/${id}`).then(r => setTender(r.data)).catch(e => console.error(e))
  }, [id])
  
  // Check qualification status when both tender and user profile are available.
  useEffect(() => {
    const check = async () => {
      if (!tender) return

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

      const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const docs = profile ? (profile.documents || []).map(d => normalize(d.type)) : []
  const userRegs = profile ? (profile.professionalRegistrations || []) : []
  const userBodies = userRegs.map(r => (r.body || '').toLowerCase())
      const userCidb = userRegs.find(r => (r.body || '').toLowerCase() === 'cidb')

  const hasDocument = (candidate) => docs.some(docValue => docValue === candidate || docValue.includes(candidate) || candidate.includes(docValue))
  const hasProfessionalBody = (candidate) => userBodies.some(body => body === candidate || body.includes(candidate) || candidate.includes(body))

      const parseCidb = (value) => {
        const match = (value || '').match(/(\d+)\s*([a-zA-Z]+)/)
        if (!match) return { level: 0, type: '' }
        return { level: parseInt(match[1], 10), type: match[2].toUpperCase().replace(/[^A-Z]/g, '') }
      }

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

      const statusOrder = []
      const statusMap = new Map()
      const mergeStatus = (key, payload) => {
        if (!statusMap.has(key)) statusOrder.push(key)
        statusMap.set(key, { ...(statusMap.get(key) || {}), ...payload })
      }

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

      ;(tender.professionalRequirements || []).forEach(req => {
        const key = `prof-${normalize(req)}`
        mergeStatus(key, {
          name: req,
          met: profile ? hasProfessionalBody(req.toLowerCase()) : null,
          type: 'professional'
        })
      })

      if (tender.cidbGrade) {
        const cidbResult = evaluateCidb(tender.cidbGrade)
        mergeStatus('cidb', {
          name: `CIDB Grade ${tender.cidbGrade}`,
          met: profile ? cidbResult.met : null,
          note: profile ? cidbResult.note : '',
          type: 'cidb'
        })
      }

      const rawRequirements = typeof tender.requirements === 'string' ? tender.requirements : ''
      const textItems = rawRequirements
        .replace(/\u2022/g, '\n')
        .split(/\r?\n/)
        .map(item => item.replace(/^[\-\*\u2022]\s*/, '').trim())
        .filter(Boolean)

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

      textItems.forEach((item, index) => {
        const lower = item.toLowerCase()
        let handled = false

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

        if (!handled) {
          const key = `text-${index}`
          mergeStatus(key, {
            name: item,
            met: null,
            type: 'text'
          })
        }
      })

      const statusList = statusOrder.map(key => statusMap.get(key)).filter(Boolean)
      setRequirementsStatus(statusList)

      if (profile) {
        const actionable = statusList.filter(s => s.met !== null)
        if (actionable.length === 0) {
          setQualify(null)
        } else {
          const qualifies = actionable.every(s => s.met)
          const missing = actionable.filter(s => !s.met).map(s => s.name)
          setQualify({ qualifies, missing })
        }
      } else {
        setQualify(null)
      }
    }
    check()
  }, [id, tender])

  if (!tender) return <p>Loading...</p>

  return (
    <div className="card">
      <div className="top-row">
        <div>
          <h2 style={{ margin: 0 }}>{tender.title}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{tender.category} • {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'No deadline'}</p>
        </div>
        <div className="tender-meta-tags">
          {(tender.requiredDocs || []).map(d => <span className="tag" key={d}>{d.toUpperCase()}</span>)}
          <div style={{ marginTop: 6 }}>
            {qualify && (qualify.qualifies ? <span className="badge" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>Qualified</span> : <span className="badge" style={{ background: 'rgba(249,115,22,0.08)', color: '#ea580c' }}>Not Qualified</span>)}
          </div>
        </div>
      </div>
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

        <p>{tender.description}</p>
        
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
                    {req.note && <div className="error-text" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{req.note}</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {req.met === null ? <span className="muted">-</span> : <span className="status-icon">{req.met ? '✅' : '❌'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>{tender.requirements || 'No requirements captured for this tender.'}</p>
        )}

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
      <div className="actions" style={{ marginTop: 12 }}>
        <Link to={`/apply/${tender._id}`} className={`btn ${qualify && !qualify.qualifies ? 'disabled' : ''}`}>Apply</Link>
        <Link to="/" className="btn ghost">Back</Link>
      </div>
    </div>
  )
}
