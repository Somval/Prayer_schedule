import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'

const RING_CENTER = 180
const OUTER_RADIUS = 168
const INNER_RADIUS = 108
const GAP_DEGREES = 2.2

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeSegment(startAngle, endAngle) {
  const p1 = polarToCartesian(RING_CENTER, RING_CENTER, OUTER_RADIUS, endAngle)
  const p2 = polarToCartesian(RING_CENTER, RING_CENTER, OUTER_RADIUS, startAngle)
  const p3 = polarToCartesian(RING_CENTER, RING_CENTER, INNER_RADIUS, startAngle)
  const p4 = polarToCartesian(RING_CENTER, RING_CENTER, INNER_RADIUS, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return [
    'M', p1.x, p1.y,
    'A', OUTER_RADIUS, OUTER_RADIUS, 0, largeArc, 0, p2.x, p2.y,
    'L', p3.x, p3.y,
    'A', INNER_RADIUS, INNER_RADIUS, 0, largeArc, 1, p4.x, p4.y,
    'Z',
  ].join(' ')
}

export default function PublicPage() {
  const [slots, setSlots] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [activeSlot, setActiveSlot] = useState(null)
  const [fullName, setFullName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'slots'), orderBy('index', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setSlots(snap.docs.map((d) => ({ docId: d.id, ...d.data() })))
      setLoaded(true)
    })
    return () => unsub()
  }, [])

  const segmentCount = slots.length
  const step = segmentCount ? 360 / segmentCount : 0
  const filledCount = useMemo(() => slots.filter((s) => s.taken).length, [slots])
  const openCount = segmentCount - filledCount

  function openModal(slot) {
    setActiveSlot(slot)
    setFullName('')
    setContact('')
    setNote('')
    setError('')
    setSuccess(false)
  }

  function closeModal() {
    setActiveSlot(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim() || !contact.trim()) {
      setError('Name and contact info are required.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const ref = doc(db, 'slots', activeSlot.docId)
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref)
        if (!snap.exists()) throw new Error('missing')
        if (snap.data().taken) throw new Error('taken')
        transaction.update(ref, {
          taken: true,
          fullName: fullName.trim(),
          contact: contact.trim(),
          note: note.trim() || null,
          createdAt: serverTimestamp(),
        })
      })
      setSuccess(true)
    } catch (err) {
      setError(
        err.message === 'taken'
          ? 'That hour was just taken. Please choose another.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">A watch kept together</p>
          <h1>24-Hour Prayer Watch</h1>
          <p className="hero-sub">
            Every hour of the day needs someone praying. Choose an open hour on the list below  once it's claimed, it locks for everyone else.
          </p>
          <div className="hero-status">
            <span className="stat-number">{loaded ? filledCount : '–'}</span>
            <span className="stat-label">of {segmentCount || 24} hours covered</span>
          </div>
        </div>

        <div className="ring-wrap">
          <svg viewBox="0 0 360 360" role="img" aria-label="24-hour watch dial">
            {slots.map((slot) => {
              const startAngle = slot.index * step + GAP_DEGREES / 2
              const endAngle = (slot.index + 1) * step - GAP_DEGREES / 2
              return (
                <path
                  key={slot.docId}
                  d={describeSegment(startAngle, endAngle)}
                  className={'ring-segment ' + (slot.taken ? 'taken' : 'open')}
                  onClick={() => !slot.taken && openModal(slot)}
                >
                  <title>{slot.label}{slot.taken ? ' — taken' : ' — open'}</title>
                </path>
              )
            })}
          </svg>
          <div className="ring-center">
            <span>{loaded ? openCount : '–'}</span>
            <small>hours open</small>
          </div>
        </div>
      </header>

      <main>
        <section className="list-section" aria-label="All hours, listed">
          <div className="list-head">
            <h2>Every hour</h2>
            <p>Prefer a Time? Tap any open hour to claim it.</p>
          </div>

          {loaded && slots.length === 0 ? (
            <div className="empty-state">
              The schedule hasn't been set up yet. Check back soon.
            </div>
          ) : (
            <div className="slot-list">
              {slots.map((slot) => (
                <button
                  key={slot.docId}
                  type="button"
                  className={'slot-card' + (slot.taken ? ' is-taken' : '')}
                  disabled={slot.taken}
                  onClick={() => openModal(slot)}
                >
                  <span className="slot-time">{slot.label}</span>
                  <span className="slot-status">
                    {slot.taken ? `Taken by ${slot.fullName?.split(' ')[0] || 'someone'}` : 'Open — tap to claim'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <p>Keeping watch, one hour at a time.</p>
      </footer>

      {activeSlot && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" role="dialog" aria-modal="true">
            <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">&times;</button>

            {!success ? (
              <>
                <p className="eyebrow">{activeSlot.label}</p>
                <h2>Claim this hour</h2>
                <form onSubmit={handleSubmit}>
                  <label>Full name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />

                  <label>Phone or email</label>
                  <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={150} />

                  <label>Note <span className="optional">(optional)</span></label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} rows={2} placeholder="e.g. Praying with my family" />

                  {error && <p className="form-error">{error}</p>}

                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Confirming…' : 'Confirm my hour'}
                  </button>
                </form>
              </>
            ) : (
              <div className="success-message">
                <p>You are signed up. Thank you for keeping watch.</p>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
