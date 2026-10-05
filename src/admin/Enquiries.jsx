import { useEffect, useState } from 'react'
import { adminCall, problem } from './api'
import { Pill, when } from './ui'
import { formatPhone } from '../lib/validation'
import { PhoneIcon } from '../components/icons'

const STATUS = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['closed', 'Closed'],
]

/** Class enquiries from the Classes page, newest first, with Call and a simple status */
export default function Enquiries() {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    adminCall('enquiries').then((r) => (r.ok ? setList(r.data.enquiries) : setError(problem(r))))
  }, [])
  const setStatus = async (id, status) => {
    const r = await adminCall('updateEnquiry', { id, status })
    if (r.ok) setList((l) => l.map((e) => (e.id === id ? r.data.enquiry : e)))
    else setError(problem(r))
  }
  if (error) return <p className="font-bold text-error">{error}</p>
  if (!list) return <p className="text-brown-2">Loading…</p>
  return (
    <div>
      <h1 className="t-h2">Class enquiries</h1>
      {list.length === 0 && <p className="mt-4 text-brown-2">No enquiries yet.</p>}
      <ul className="mt-4 space-y-3">
        {list.map((e) => (
          <li key={e.id} className="rounded-card border border-line bg-[#fffcf5] p-4" data-admin-enquiry={e.name}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{e.name}</p>
              <Pill tone={e.status === 'new' ? 'warn' : 'plain'}>{STATUS.find(([k]) => k === e.status)?.[1]}</Pill>
            </div>
            <p className="mt-1">{e.interest}</p>
            {e.preferred_dates && <p className="t-small">Dates: {e.preferred_dates}</p>}
            {e.message && <p className="t-small mt-1 whitespace-pre-wrap">“{e.message}”</p>}
            <p className="t-small mt-1 text-brown-2">
              {when(e.created_at)} · {e.lang === 'kn' ? 'Kannada' : 'English'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={`tel:+91${e.phone}`} className="inline-flex min-h-12 items-center gap-2 rounded-control bg-ink px-4 font-bold text-gold-light">
                <PhoneIcon className="h-5 w-5" /> {formatPhone(e.phone)}
              </a>
              <label className="flex items-center gap-2">
                <span className="t-small font-bold">Status</span>
                <select className="field-control w-40" value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)}>
                  {STATUS.map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
