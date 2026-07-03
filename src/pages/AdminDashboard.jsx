import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { formatTime, formatDateTime } from '../utils.js'

const SEGMENT_COUNT = 24

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [slots, setSlots] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin')
      } else {
        setCheckingAuth(false)
      }
    })
    return () => unsub()
  }, [navigate])

  useEffect(() => {
    if (checkingAuth) return
    const q = query(collection(db, 'slots'), orderBy('index', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setSlots(snap.docs.map((d) => ({ docId: d.id, ...d.data() })))
      setLoaded(true)
    })
    return () => unsub()
  }, [checkingAuth])

  async function handleRelease(slot) {
    if (!window.confirm('Release this hour? This removes the current sign-up and makes it available again.')) return
    await updateDoc(doc(db, 'slots', slot.docId), {
      taken: false,
      fullName: null,
      contact: null,
      note: null,
      createdAt: null,
    })
  }

  async function handleGenerateSchedule() {
    const startStr = window.prompt(
      'Start date/time for the watch (e.g. 2026-07-10 18:00):',
      ''
    )
    if (!startStr) return
    const start = new Date(startStr)
    if (isNaN(start.getTime())) {
      alert('Could not understand that date/time. Try a format like 2026-07-10 18:00')
      return
    }
    start.setSeconds(0, 0)

    const batch = writeBatch(db)
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const s = new Date(start.getTime() + i * 60 * 60 * 1000)
      const e = new Date(s.getTime() + 60 * 60 * 1000)
      const ref = doc(db, 'slots', `slot-${i + 1}`)
      batch.set(ref, {
        index: i,
        label: `${formatTime(s)} - ${formatTime(e)}`,
        startTime: s.toISOString(),
        endTime: e.toISOString(),
        taken: false,
        fullName: null,
        contact: null,
        note: null,
        createdAt: null,
      })
    }
    await batch.commit()
  }

  function handleExportCsv() {
    const header = ['Hour', 'Time', 'Status', 'Name', 'Contact', 'Note', 'Signed up at']
    const rows = slots.map((s) => [
      s.index + 1,
      s.label,
      s.taken ? 'Filled' : 'Open',
      s.fullName || '',
      s.contact || '',
      s.note || '',
      s.createdAt ? formatDateTime(s.createdAt) : '',
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prayer_watch_signups.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/admin')
  }

  if (checkingAuth) return null

  const filledCount = slots.filter((s) => s.taken).length

  return (
    <div className="admin-body">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Prayer Watch</p>
          <h1>Sign-up dashboard</h1>
        </div>
        <div className="admin-header-actions">
          {slots.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={handleExportCsv}>Export CSV</button>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleGenerateSchedule}>
            {slots.length > 0 ? 'Regenerate schedule' : 'Generate schedule'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-main">
        {loaded && slots.length === 0 ? (
          <div className="empty-state">
            No schedule yet. Click "Generate schedule" above to create the 24 hourly slots.
          </div>
        ) : (
          <>
            <div className="stat-strip">
              <div className="stat-pill">
                <span className="stat-number">{filledCount}/{slots.length}</span>
                <span className="stat-label">hours covered</span>
              </div>
              <div className="stat-pill">
                <span className="stat-number">{slots.length - filledCount}</span>
                <span className="stat-label">hours still open</span>
              </div>
            </div>

            <table className="signup-table">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Note</th>
                  <th>Signed up</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.docId}>
                    <td>{slot.index + 1}</td>
                    <td>{slot.label}</td>
                    <td>
                      {slot.taken ? (
                        <span className="badge badge-taken">Filled</span>
                      ) : (
                        <span className="badge badge-open">Open</span>
                      )}
                    </td>
                    <td>{slot.fullName || '—'}</td>
                    <td>{slot.contact || '—'}</td>
                    <td>{slot.note || '—'}</td>
                    <td>{slot.createdAt ? formatDateTime(slot.createdAt) : '—'}</td>
                    <td>
                      {slot.taken ? (
                        <button type="button" className="btn btn-ghost btn-small" onClick={() => handleRelease(slot)}>
                          Release
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>

      <p style={{ textAlign: 'center', paddingBottom: '2rem' }}>
        <Link className="back-link" to="/">&larr; View the public schedule</Link>
      </p>
    </div>
  )
}
