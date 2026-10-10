import { useState } from 'react'
import { adminCall } from './api'
import { Btn, card, ErrorText, LinkBtn, Loading, PageTitle, Pill, Tabs, useAdminData, when, whatsappTo } from './ui'
import { formatPhone } from '../lib/validation'
import { WhatsAppIcon } from '../components/icons'

/** Messages from the website (class questions and the Contact page), newest first: reply on WhatsApp, then mark handled */
export default function Enquiries() {
  const { data, error, setData } = useAdminData(() => adminCall('enquiries'), [], { every: 60_000 })
  const [show, setShow] = useState('new')
  const [problemText, setProblem] = useState('')
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const list = data.enquiries
  const counts = { new: list.filter((e) => !e.handled).length, handled: list.filter((e) => e.handled).length }
  const setStatus = async (id, status) => {
    const r = await adminCall('updateEnquiry', { id, status })
    if (r.ok) setData({ enquiries: list.map((e) => (e.id === id ? r.data.enquiry : e)) })
    else setProblem('That didn’t save. Please try again.')
  }
  const shown = list.filter((e) => (show === 'new' ? !e.handled : e.handled))
  return (
    <div className="space-y-4">
      <PageTitle>Enquiries</PageTitle>
      <Tabs
        tabs={[
          ['new', 'New'],
          ['handled', 'Handled'],
        ]}
        value={show}
        onChange={setShow}
        label="Enquiries"
        counts={counts}
      />
      <ErrorText>{problemText}</ErrorText>
      {shown.length === 0 && <p className="text-brown-2">{show === 'new' ? 'No new messages.' : 'Nothing here yet.'}</p>}
      <ul className="space-y-3">
        {shown.map((e) => (
          <li key={e.id} className={card} data-admin-enquiry={e.name}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{e.name}</p>
              <Pill tone={e.kind === 'general' ? 'plain' : 'dark'}>{e.kind === 'general' ? 'Message' : 'Classes'}</Pill>
            </div>
            {e.kind !== 'general' && <p className="mt-1">{e.interest}</p>}
            {e.preferred_dates && <p className="t-small">Dates: {e.preferred_dates}</p>}
            {e.message && <p className="mt-1 whitespace-pre-wrap">“{e.message}”</p>}
            <p className="t-small mt-1 text-brown-2">
              {when(e.created_at)} · {formatPhone(e.phone)} · {e.lang === 'kn' ? 'wrote in Kannada' : 'wrote in English'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LinkBtn tone="whatsapp" href={whatsappTo(e.phone, `Hi ${e.name}, this is Hema from Dream Kitchen. Thank you for your message!`)} data-admin-reply>
                <WhatsAppIcon className="h-5 w-5" /> Reply on WhatsApp
              </LinkBtn>
              {e.handled ? (
                <Btn tone="light" onClick={() => setStatus(e.id, 'new')}>
                  Mark as new
                </Btn>
              ) : (
                <Btn tone="go" onClick={() => setStatus(e.id, 'handled')} data-admin-handled>
                  Mark handled
                </Btn>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
