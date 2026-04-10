'use client'

import React, { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type Photo = { url: string; name: string }
type Video = { url: string; name: string }

function getPhotosForItem(photoMap: Record<string, Photo[]>, itemName: string) {
  const direct = photoMap[itemName]
  if (direct?.length) return direct

  const matched = Object.entries(photoMap).find(([key, photos]) => (
    key.endsWith(`|${itemName}`) && photos.length > 0
  ))

  return matched?.[1] || []
}

function getVideosForItem(videoMap: Record<string, Video[]>, itemName: string) {
  const direct = videoMap[itemName]
  if (direct?.length) return direct

  const matched = Object.entries(videoMap).find(([key, videos]) => (
    key.endsWith(`|${itemName}`) && videos.length > 0
  ))

  return matched?.[1] || []
}

// ── Photos Section ────────────────────────────────────────────────────────────
function PhotosSection({ photoMap }: { photoMap: Record<string, Photo[]> }) {
  const [preview, setPreview] = useState<string | null>(null)

  function label(key: string) {
    const map: Record<string, string> = {
      complaint: 'Customer Complaint', findings: "Mechanic's Findings",
      problem: 'Problem Description', diag_notes: "Mechanic's Diagnosis", result: 'Final Notes',
    }
    if (map[key]) return map[key]
    const [sec, ...rest] = key.split('|')
    const secLabels: Record<string, string> = {
      body: 'Body / Exterior', engine: 'Engine / Under Hood', brakes: 'Brakes',
      suspension: 'Suspension / Steering', tyres: 'Tyres', obd: 'OBD Diagnostic', test_drive: 'Test Drive',
      tasks: 'Tasks Done', checking: 'General Checking',
    }
    return `${secLabels[sec] || sec} — ${rest.join('|')}`
  }

  const groups = Object.entries(photoMap).filter(([, photos]) => photos.length > 0)
  if (groups.length === 0) return null

  return (
    <>
      <div className="border-t border-neutral-100">
        <div className="bg-neutral-900 px-5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-white">Photos</span>
        </div>
        <div className="px-5 py-4 space-y-4">
          {groups.map(([key, photos]) => (
            <div key={key}>
              <div className="text-xs font-medium text-neutral-500 mb-2">{label(key)}</div>
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img src={photo.url} alt={photo.name} onClick={() => setPreview(photo.url)}
                      className="w-20 h-20 object-cover rounded-lg border border-neutral-200 cursor-pointer hover:opacity-90" />
                    <a href={photo.url} download={photo.name}
                      className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">↓</a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={preview} alt="Preview" className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain shadow-2xl" />
            <a href={preview} download="photo.jpg"
              className="absolute bottom-3 left-3 text-xs bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30">↓ Download</a>
            <button onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 text-sm">✕</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Send Modal ────────────────────────────────────────────────────────────────
function SendModal({
  onClose, onSent, id, reportToken, vehicleMake, vehicleModel, vehiclePlate, clientEmail, clientPhone, reportTitle, company,
}: {
  onClose: () => void
  onSent: () => void
  id: string
  reportToken?: string
  vehicleMake?: string
  vehicleModel?: string
  vehiclePlate?: string
  clientEmail?: string
  clientPhone?: string
  reportTitle?: string
  company?: { name: string; phone: string; address: string }
}) {
  const companyName = company?.name || 'Same Day Car Repair'
  const vehicleStr = [vehicleMake, vehicleModel, vehiclePlate].filter(Boolean).join(' ')
  const titleStr = reportTitle || 'Report'
  const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  const subjectDefault = `Your ${titleStr}${vehicleStr ? ` — ${vehicleStr}` : ''} — ${dateStr}`
  const reportUrl = reportToken ? `/report/${reportToken}` : null
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'http://localhost:3000'
  const fullReportUrl = `${baseUrl}${reportUrl}`

  const [tab, setTab] = useState<'email' | 'whatsapp'>('email')
  const [emails, setEmails] = useState([clientEmail || ''])
  const [subject, setSubject] = useState(subjectDefault)
  const [message, setMessage] = useState('Please find your report attached below. You can view and download it using the link.')
  const [phone, setPhone] = useState(clientPhone || '')
  const [waMessage, setWaMessage] = useState(`Hi! Here is your ${titleStr.toLowerCase()} from ${companyName}:\n\n${fullReportUrl}\n\nFeel free to download or save it for your records.`)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function addEmail() { setEmails(prev => [...prev, '']) }
  function updateEmail(idx: number, val: string) { setEmails(prev => prev.map((e, i) => i === idx ? val : e)) }
  function removeEmail(idx: number) { setEmails(prev => prev.filter((_, i) => i !== idx)) }

  async function markCompleted() {
    const supabase = createClient()
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', id)
    onSent()
  }

  async function logSend(channel: 'email' | 'whatsapp', recipients: string[]) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('report_sends').insert([{
        job_id:       id,
        report_token: reportToken,
        sent_to:      recipients,
        channel,
        sent_by:      user.id,
      }])
    } catch { /* non-fatal */ }
  }

  async function handleSendEmail() {
    if (!reportUrl) {
      setError('Public report link is still loading. Please try again in a moment.')
      return
    }
    const valid = emails.filter(e => e.trim() && e.includes('@'))
    if (!valid.length) { setError('Please enter at least one valid email address'); return }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: valid, subject, message, reportUrl, company }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      await Promise.all([markCompleted(), logSend('email', valid)])
      setSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleSendWhatsApp() {
    if (!reportUrl) {
      setError('Public report link is still loading. Please try again in a moment.')
      return
    }

    const normalised = phone.replace(/[^\d+]/g, '')
    if (!normalised) {
      setError('Please enter a valid phone number with country code.')
      return
    }

    const encoded = encodeURIComponent(waMessage)
    const url = normalised
      ? `https://api.whatsapp.com/send?phone=${normalised.replace(/^\+/, '')}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`

    const popup = window.open(url, '_blank', 'noopener,noreferrer')
    if (!popup) {
      setError('Could not open WhatsApp. Please allow pop-ups and try again.')
      return
    }

    setSending(true)
    setError('')
    try {
      await Promise.all([markCompleted(), logSend('whatsapp', [phone])])
      setSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to prepare WhatsApp share.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="font-semibold text-neutral-900">Send report to client</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">✕</button>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-semibold text-neutral-900 mb-1">Report sent!</div>
            <div className="text-sm text-neutral-500 mb-5">
              {tab === 'email'
                ? `Sent to ${emails.filter(e => e.trim()).join(', ')}`
                : 'WhatsApp opened — message ready to send'}
            </div>
            <button onClick={onClose} className="text-sm px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">Close</button>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex gap-1 px-6 pt-4">
              <button
                onClick={() => setTab('email')}
                className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${tab === 'email' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
              >
                ✉️ Email
              </button>
              <button
                onClick={() => setTab('whatsapp')}
                className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${tab === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
              >
                💬 WhatsApp
              </button>
            </div>

            {tab === 'email' ? (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-2 block">To</label>
                  <div className="space-y-2">
                    {emails.map((email, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input type="email" value={email} onChange={e => updateEmail(idx, e.target.value)}
                          placeholder="client@email.com"
                          className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400" />
                        {emails.length > 1 && (
                          <button onClick={() => removeEmail(idx)} className="text-neutral-300 hover:text-red-400 px-1 text-lg leading-none">✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addEmail} className="text-xs text-blue-600 hover:text-blue-800">+ Add another email</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Subject</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                    className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none" />
                </div>
                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <div className="flex gap-2 pt-1">
                  <button onClick={onClose} className="flex-1 text-sm py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
                  <button onClick={handleSendEmail} disabled={sending}
                    className="flex-1 text-sm py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50">
                    {sending ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Phone number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+61 400 000 000"
                    className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400" />
                  <p className="text-xs text-neutral-400 mt-1">Include country code, e.g. +61 for Australia</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Message</label>
                  <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={5}
                    className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400 resize-none" />
                </div>
                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <div className="flex gap-2 pt-1">
                  <button onClick={onClose} className="flex-1 text-sm py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
                  <button onClick={handleSendWhatsApp} disabled={sending || !reportUrl}
                    className="flex-1 text-sm py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {sending ? 'Opening…' : 'Open WhatsApp →'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Mock data — después vendrá de Supabase (jobs + checklist_data JSONB)
const REPORT = {
  id: '1',
  type: 'Pre-Purchase Inspection',
  date: '27 March 2026',
  odometer: '259,865 km',
  location: 'Waverley, NSW',
  client: { name: 'Jesus Nunez', phone: '+61 413 852 877', email: 'jesus@email.com' },
  vehicle: { make: 'Toyota RAV4 2015', plate: 'ABC-123 · NSW', odometer: '259,865 km' },
  sections: [
    {
      label: 'Body / Exterior',
      items: [
        { name: 'Paint condition',      result: 'Good', comment: '' },
        { name: 'Body panels / dents',  result: 'Fair', comment: 'Minor dent on rear right door' },
        { name: 'Windscreen / glass',   result: 'Good', comment: '' },
      ],
    },
    {
      label: 'Engine / Under Hood',
      items: [
        { name: 'Oil leaks',                          result: 'Poor', comment: 'Sump plug, head rocker gasket, oil filter and sump leak detected' },
        { name: 'Fluids (coolant, oil, brakes)',      result: 'Good', comment: '' },
        { name: 'Auxiliary / serpentine belt',        result: 'Good', comment: '' },
        { name: 'Engine & transmission noises',       result: 'Good', comment: '' },
        { name: 'Coolant hoses',                      result: 'Good', comment: 'Did not feel swollen' },
      ],
    },
    {
      label: 'Brakes',
      items: [
        { name: 'Front brake pads / rotors', result: 'Good', comment: '' },
        { name: 'Rear brake pads / rotors',  result: 'Good', comment: '' },
      ],
    },
    {
      label: 'Suspension / Steering',
      items: [
        { name: 'Front suspension', result: 'Good', comment: '' },
        { name: 'Rear suspension',  result: 'Fair', comment: 'Sway bar links need replacement. Monitor rear shock absorbers' },
        { name: 'Steering',         result: 'Good', comment: '' },
      ],
    },
    {
      label: 'Tyres',
      items: [
        { name: 'Front tyres', result: 'Good', comment: '' },
        { name: 'Rear tyres',  result: 'Fair', comment: 'Check again in 3 months' },
      ],
    },
    {
      label: 'OBD Diagnostic',
      items: [
        { name: 'Fault codes', result: 'None',   comment: 'No fault codes detected during scan' },
        { name: 'CO2 test',    result: 'Passed', comment: 'No colour change — head gasket integrity confirmed' },
      ],
    },
    {
      label: 'Test Drive',
      items: [
        { name: 'Overall behaviour',    result: 'Good', comment: 'All good during test drive' },
        { name: 'Noises / vibrations',  result: 'Good', comment: '' },
      ],
    },
  ],
  additionalNotes: 'Sunroof not operating. Open door sensor faulty — on even when doors are properly closed. Vehicle had 1.5L extra oil at time of inspection — corrected on site. Engine and transmission operating normally. No fault codes detected.',
  recommendations: [
    { type: 'IMMEDIATE', text: 'Oil leaks — sump plug, rocker gasket, oil filter and sump require immediate attention' },
    { type: 'MONITOR',   text: 'Sway bar links — replace when possible' },
    { type: 'MONITOR',   text: 'Rear tyres — check condition in 3 months' },
    { type: 'MONITOR',   text: 'Rear shock absorbers — monitor at next service' },
  ],
}

const SERVICE_REPORT = {
  id: '1',
  type: 'service',
  typeLabel: 'Major Service',
  date: '4 April 2026',
  odometer: '85,000 km',
  location: 'Bondi, NSW',
  client: { name: 'Octa Juarez', phone: '+61 400 111 222', email: 'octa@email.com' },
  vehicle: { make: 'Honda CRV 2008', plate: 'BFW34T · NSW', odometer: '85,000 km' },
  sections: [
    {
      label: 'Tasks Done',
      items: [
        { name: 'Oil change',      result: 'Done', comment: '' },
        { name: 'Oil filter',      result: 'Done', comment: '' },
        { name: 'Oil plug washer', result: 'Done', comment: '' },
        { name: 'Cabin filter',    result: 'Done', comment: '' },
        { name: 'Air filter',      result: 'Done', comment: '' },
        { name: 'Spark plugs',     result: 'Done', comment: '' },
      ],
    },
    {
      label: 'General Checking',
      items: [
        { name: 'Tyre condition',  result: 'Good', comment: '' },
        { name: 'Brake pads',      result: 'Fair', comment: 'Front pads at ~40%, monitor' },
        { name: 'Coolant level',   result: 'Good', comment: '' },
        { name: 'Oil level',       result: 'Good', comment: '' },
        { name: 'Other',           result: 'Good', comment: '' },
      ],
    },
  ],
  nextService: [
    { label: 'Minor service',  value: '95,000 km' },
    { label: 'Spark plugs',    value: '105,000 km' },
    { label: 'Cabin filter',   value: '105,000 km' },
    { label: 'Air filter',     value: '105,000 km' },
  ],
  additionalNotes: '',
  recommendations: [] as { type: string; text: string }[],
}

const RESULT_STYLES: Record<string, { badge: string }> = {
  Good:        { badge: 'bg-green-50 text-green-700 border border-green-200' },
  Fair:        { badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Poor:        { badge: 'bg-red-50 text-red-600 border border-red-200' },
  None:        { badge: 'bg-green-50 text-green-700 border border-green-200' },
  Passed:      { badge: 'bg-green-50 text-green-700 border border-green-200' },
  Failed:      { badge: 'bg-red-50 text-red-600 border border-red-200' },
  'Codes found': { badge: 'bg-red-50 text-red-600 border border-red-200' },
  Minor:       { badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Notable:     { badge: 'bg-red-50 text-red-600 border border-red-200' },
  Done:        { badge: 'bg-green-50 text-green-700 border border-green-200' },
  'N/A':       { badge: 'bg-neutral-100 text-neutral-500 border border-neutral-200' },
}

const REC_STYLES: Record<string, string> = {
  IMMEDIATE: 'bg-red-50 text-red-700 border border-red-200',
  MONITOR:   'bg-amber-50 text-amber-700 border border-amber-200',
  ADVISORY:  'bg-blue-50 text-blue-700 border border-blue-200',
}

function getVerdict(sections: typeof REPORT.sections) {
  const allItems = sections.flatMap(s => s.items)
  const poor = allItems.filter(i => i.result === 'Poor' || i.result === 'Failed' || i.result === 'Codes found').length

  if (poor >= 3) return { label: 'Not recommended', sub: `${poor} items require immediate attention before purchase.`, color: 'text-red-700', border: 'border-red-200 bg-red-50' }
  if (poor >= 1) return { label: 'Purchase with caution', sub: `${poor} item${poor > 1 ? 's' : ''} require${poor === 1 ? 's' : ''} immediate attention before or after purchase.`, color: 'text-amber-700', border: 'border-amber-200 bg-amber-50' }
  return { label: 'Recommended for purchase', sub: 'No critical issues found. Vehicle is in good overall condition.', color: 'text-green-700', border: 'border-green-200 bg-green-50' }
}

function countResults(sections: typeof REPORT.sections) {
  const all = sections.flatMap(s => s.items)
  const good  = all.filter(i => ['Good','None','Passed'].includes(i.result)).length
  const fair  = all.filter(i => ['Fair','Minor'].includes(i.result)).length
  const poor  = all.filter(i => ['Poor','Failed','Codes found','Notable'].includes(i.result)).length
  return { good, fair, poor }
}

function ReportShell({ id, title, subtitle, data, snapshot, company, children }: {
  id: string
  title: string
  subtitle: string
  data: { date: string; odometer: string; location: string; client: { name: string; phone: string; email: string }; vehicle: { make: string; plate: string; odometer: string } }
  snapshot: Record<string, unknown>
  company?: { name: string; phone: string; address: string }
  children: React.ReactNode
}) {
  const router = useRouter()
  const [showSend, setShowSend] = useState(false)
  const [reportToken, setReportToken] = useState<string | null>(null)
  const [versions, setVersions] = useState<{ version: number; token: string; created_at: string }[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [savingVersion, setSavingVersion] = useState(false)

  function loadVersions() {
    if (!id) return
    const supabase = createClient()
    supabase.from('job_reports').select('version, token, created_at').eq('job_id', id).order('version', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setVersions(data)
          setReportToken(data[0].token)
        } else {
          // fallback legacy
          supabase.from('jobs').select('public_token').eq('id', id).single()
            .then(({ data: j }) => { if (j?.public_token) setReportToken(j.public_token) })
        }
      })
  }

  useEffect(() => { loadVersions() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveNewVersion() {
    setSavingVersion(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase.from('users').select('active_company_id, company_id').eq('id', user.id).single()
      const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1
      await supabase.from('job_reports').insert([{
        job_id:     id,
        version:    nextVersion,
        snapshot,
        type:       title.toLowerCase().replace(/ /g, '_'),
        company_id: userData?.active_company_id || userData?.company_id,
        user_id:    user.id,
      }])
      loadVersions()
    } finally {
      setSavingVersion(false)
    }
  }

  const vehicleParts = data.vehicle.make.split(' ')
  const vehicleMake  = vehicleParts[0]
  const vehicleModel = vehicleParts.slice(1, -1).join(' ')
  const vehiclePlate = data.vehicle.plate.split(' ')[0]

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <style>{`
        @media print {
          @page { margin: 12mm; size: A4; }
          body * { visibility: hidden; }
          #report-printable, #report-printable * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #report-printable { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      {showSend && (
        <SendModal
          onClose={() => setShowSend(false)}
          onSent={() => setShowSend(false)}
          id={id}
          reportToken={reportToken || undefined}
          vehicleMake={vehicleMake}
          vehicleModel={vehicleModel}
          vehiclePlate={vehiclePlate}
          clientEmail={data.client.email}
          clientPhone={data.client.phone}
          reportTitle={title}
          company={company}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <button onClick={() => router.push(`/jobs/${id}`)} className="text-sm text-neutral-500 hover:text-neutral-700 text-left">← Back to job</button>
        <div className="flex flex-wrap gap-2">
          {versions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowVersions(v => !v)}
                className="flex-1 sm:flex-none text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-500"
              >
                v{versions[0].version} ▾
              </button>
              {showVersions && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 min-w-[200px] py-1">
                  {versions.map(v => (
                    <a
                      key={v.token}
                      href={`/report/${v.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 text-sm"
                    >
                      <span className="font-medium text-neutral-900">Version {v.version}</span>
                      <span className="text-xs text-neutral-400 ml-4">
                        {new Date(v.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </a>
                  ))}
                  <div className="border-t border-neutral-100 mt-1 pt-1">
                    <button
                      onClick={() => { setShowVersions(false); saveNewVersion() }}
                      disabled={savingVersion}
                      className="w-full text-left px-4 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {savingVersion ? 'Saving…' : '+ Save as new version'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setShowSend(true)} className="flex-1 sm:flex-none text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Send to client</button>
          <button onClick={() => window.print()} className="flex-1 sm:flex-none text-sm px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">Download PDF</button>
        </div>
      </div>
      <div id="report-printable" className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="bg-neutral-900 px-6 py-5">
          <div className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1">{title}</div>
          <div className="text-xl font-bold text-white">{subtitle}</div>
          <div className="text-xs text-neutral-400 mt-1">{company?.name || 'Same Day Car Repair'}{company?.phone ? ` · ${company.phone}` : ''}{company?.address ? ` · ${company.address}` : ''}</div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 border-b border-neutral-100 bg-neutral-50 text-sm">
          <div><span className="text-neutral-400 text-xs block">Date</span><div className="font-semibold text-neutral-900 text-sm">{data.date}</div></div>
          {data.location && data.location !== '—' && <div><span className="text-neutral-400 text-xs block">Location</span><div className="font-semibold text-neutral-900 text-sm">{data.location}</div></div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-neutral-100">
          <div className="p-4 sm:border-r border-b sm:border-b-0 border-neutral-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-white bg-green-700 px-3 py-1.5 rounded mb-3 inline-block">Client Information</div>
            {[{ label: 'Client Name', value: data.client.name }, { label: 'Phone', value: data.client.phone }, { label: 'Email', value: data.client.email }].map(row => (
              <div key={row.label} className="py-1">
                <span className="text-xs text-neutral-400 block">{row.label}</span>
                <span className="text-sm font-semibold text-neutral-900 break-all">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 px-3 py-1.5 rounded mb-3 inline-block">Vehicle Information</div>
            {[{ label: 'Vehicle', value: data.vehicle.make }, { label: 'Plate / Rego', value: data.vehicle.plate }, { label: 'Odometer', value: data.vehicle.odometer }].map(row => (
              <div key={row.label} className="py-1">
                <span className="text-xs text-neutral-400 block">{row.label}</span>
                <span className="text-sm font-semibold text-neutral-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        {children}
        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            DISCLAIMER: This report is based on a visual and functional inspection performed at the time of service. It is provided for informational purposes only and does not constitute a guarantee of the vehicle&apos;s condition, past history, or future performance. Same Day Car Repair accepts no liability for any issues that may arise after the inspection.
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionsBody({ sections, additionalNotes, recommendations, photoMap, videoMap }: {
  sections: typeof REPORT.sections
  additionalNotes: string
  recommendations: { type: string; text: string }[]
  photoMap: Record<string, Photo[]>
  videoMap: Record<string, Video[]>
}) {
  const verdict = getVerdict(sections)
  const counts = countResults(sections)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  function toggle(label: string) {
    setCollapsed(prev => {
      const n = new Set(prev)
      if (n.has(label)) n.delete(label)
      else n.add(label)
      return n
    })
  }
  return (
    <>
      <div className={`mx-5 my-4 rounded-lg border px-5 py-4 ${verdict.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Overall Verdict</div>
            <div className={`text-lg font-bold ${verdict.color}`}>{verdict.label}</div>
            <div className="text-xs text-neutral-500 mt-1">{verdict.sub}</div>
          </div>
          <div className="flex gap-5 text-right flex-shrink-0">
            <div><div className="text-2xl font-bold text-green-700">{counts.good}</div><div className="text-xs text-neutral-400">Good</div></div>
            <div><div className="text-2xl font-bold text-amber-700">{counts.fair}</div><div className="text-xs text-neutral-400">Fair</div></div>
            <div><div className="text-2xl font-bold text-red-600">{counts.poor}</div><div className="text-xs text-neutral-400">Poor</div></div>
          </div>
        </div>
      </div>
      {sections.map(section => (
        <div key={section.label} className="border-t border-neutral-100">
          <button onClick={() => toggle(section.label)} className="w-full bg-neutral-900 px-5 py-2.5 flex items-center justify-between hover:bg-neutral-800 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">{section.label}</span>
            <span className="text-neutral-400 text-xs">{collapsed.has(section.label) ? '▼' : '▲'}</span>
          </button>
          {!collapsed.has(section.label) && (
            <div className="divide-y divide-neutral-100">
	              {section.items.map(item => (
	                <div key={item.name} className="flex items-start justify-between px-5 py-3">
	                  <div className="flex-1 pr-4">
	                    <div className="text-sm font-semibold text-neutral-900">{item.name}</div>
	                    {item.comment ? <div className="text-xs italic text-neutral-500 mt-0.5">{item.comment}</div> : <div className="text-xs text-neutral-300 mt-0.5">—</div>}
                      <InlinePhotos photos={getPhotosForItem(photoMap, item.name)} />
                      <InlineVideos videos={getVideosForItem(videoMap, item.name)} />
	                  </div>
	                  <span className={`text-xs font-semibold px-3 py-1 rounded flex-shrink-0 ${RESULT_STYLES[item.result]?.badge || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>{item.result}</span>
	                </div>
	              ))}
	            </div>
          )}
        </div>
      ))}
      {additionalNotes && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Additional Notes</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed">{additionalNotes}</p></div>
        </div>
      )}
      {recommendations.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Recommendations</span></div>
          <div className="divide-y divide-neutral-100">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3">
                <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${REC_STYLES[rec.type] || 'bg-neutral-100 text-neutral-600'}`}>{rec.type}</span>
                <span className="text-sm text-neutral-700">{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
	    </>
  )
}

function ServiceBody({ sections, nextService, additionalNotes, photoMap, videoMap }: {
  sections: typeof SERVICE_REPORT.sections
  nextService: { label: string; value: string }[]
  additionalNotes: string
  photoMap: Record<string, Photo[]>
  videoMap: Record<string, Video[]>
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  function toggle(label: string) {
    setCollapsed(prev => {
      const n = new Set(prev)
      if (n.has(label)) n.delete(label)
      else n.add(label)
      return n
    })
  }

  const allItems = sections.flatMap(s => s.items)
  const done = allItems.filter(i => i.result === 'Done').length
  const na   = allItems.filter(i => i.result === 'N/A').length
  const attention = allItems.filter(i => ['Poor','Fair','Failed','Codes found'].includes(i.result)).length

  return (
    <>
      {/* Summary bar — same style as inspection verdict */}
      <div className={`mx-5 my-4 rounded-lg border px-5 py-4 ${attention > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Service Summary</div>
            <div className={`text-lg font-bold ${attention > 0 ? 'text-amber-700' : 'text-green-700'}`}>
              {attention > 0 ? 'Service completed — items to monitor' : 'Service completed'}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {attention > 0 ? `${attention} item${attention > 1 ? 's' : ''} require attention.` : 'All tasks performed successfully.'}
            </div>
          </div>
          <div className="flex gap-5 text-right flex-shrink-0">
            <div><div className="text-2xl font-bold text-green-700">{done}</div><div className="text-xs text-neutral-400">Done</div></div>
            <div><div className="text-2xl font-bold text-neutral-400">{na}</div><div className="text-xs text-neutral-400">N/A</div></div>
            {attention > 0 && <div><div className="text-2xl font-bold text-amber-700">{attention}</div><div className="text-xs text-neutral-400">Attention</div></div>}
          </div>
        </div>
      </div>

      {/* Sections — identical structure to inspection */}
      {sections.map(section => (
        <div key={section.label} className="border-t border-neutral-100">
          <button onClick={() => toggle(section.label)} className="w-full bg-neutral-900 px-5 py-2.5 flex items-center justify-between hover:bg-neutral-800 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">{section.label}</span>
            <span className="text-neutral-400 text-xs">{collapsed.has(section.label) ? '▼' : '▲'}</span>
          </button>
          {!collapsed.has(section.label) && (
            <div className="divide-y divide-neutral-100">
	              {section.items.map(item => (
	                <div key={item.name} className="flex items-start justify-between px-5 py-3">
	                  <div className="flex-1 pr-4">
	                    <div className="text-sm font-semibold text-neutral-900">{item.name}</div>
	                    {item.comment ? <div className="text-xs italic text-neutral-500 mt-0.5">{item.comment}</div> : <div className="text-xs text-neutral-300 mt-0.5">—</div>}
                      <InlinePhotos photos={getPhotosForItem(photoMap, item.name)} />
                      <InlineVideos videos={getVideosForItem(videoMap, item.name)} />
	                  </div>
	                  <span className={`text-xs font-semibold px-3 py-1 rounded flex-shrink-0 ${RESULT_STYLES[item.result]?.badge || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>{item.result}</span>
	                </div>
	              ))}
	            </div>
          )}
        </div>
      ))}

      {/* Next service recommendations */}
      {nextService.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Next Service Recommendations</span></div>
          <div className="divide-y divide-neutral-100">
            {nextService.map(row => (
              <div key={row.label} className="flex items-start justify-between px-5 py-3">
                <span className="text-sm text-neutral-700">{row.label}</span>
                <span className="text-sm font-semibold text-neutral-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {additionalNotes && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Additional Notes</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed">{additionalNotes}</p></div>
        </div>
      )}
	    </>
  )
}

// ── Build sections from flow data ─────────────────────────────────────────────
function buildPrePurchaseSections(flowData: Record<string, unknown>) {
  const SECTION_DEFS = [
    { key: 'body',       label: 'Body / Exterior',       items: ['Paint condition','Body panels / dents','Windscreen / glass'] },
    { key: 'engine',     label: 'Engine / Under Hood',   items: ['Oil leaks','Fluids (coolant, oil, brakes)','Auxiliary / serpentine belt','Engine & transmission noises','Coolant hoses'] },
    { key: 'brakes',     label: 'Brakes',                items: ['Front brake pads / rotors','Rear brake pads / rotors'] },
    { key: 'suspension', label: 'Suspension / Steering', items: ['Front suspension','Rear suspension','Steering'] },
    { key: 'tyres',      label: 'Tyres',                 items: ['Front tyres','Rear tyres'] },
    { key: 'obd',        label: 'OBD Diagnostic',        items: ['Fault codes','CO2 test'] },
    { key: 'test_drive', label: 'Test Drive',            items: ['Overall behaviour','Noises / vibrations'] },
  ]
  const selections = (flowData.selections as Record<string, Record<string, string>>) || {}
  const comments = (flowData.comments as Record<string, Record<string, string>>) || {}
  return SECTION_DEFS.map(sec => ({
    label: sec.label,
    items: sec.items
      .map(name => ({ name, result: selections[sec.key]?.[name] || '', comment: comments[sec.key]?.[name] || '' }))
      .filter(item => item.result !== ''),
  })).filter(sec => sec.items.length > 0)
}

function buildServiceSections(flowData: Record<string, unknown>) {
  const serviceType = (flowData.serviceType as string) || ''
  const selections = (flowData.selections as Record<string, Record<string, string>>) || {}
  const comments = (flowData.comments as Record<string, Record<string, string>>) || {}

  const taskItems: string[] =
    serviceType === 'Minor Service'     ? ['Oil change','Oil filter','Oil plug washer'] :
    serviceType === 'Major Service'     ? ['Oil change','Oil filter','Oil plug washer','Cabin filter','Air filter','Spark plugs'] :
    serviceType === 'Brake fluid flush' ? ['Brake fluid replacement'] :
    serviceType === 'Coolant flush'     ? ['Coolant replacement'] :
    serviceType === 'Spark plugs'       ? ['Spark plugs replacement'] :
    serviceType === 'Custom'            ? ((flowData.customTasks as string[]) || []).filter(Boolean) :
    Object.keys(selections['tasks'] || {})  // fallback: show whatever was recorded

  const checkItems = ['Tyre condition','Brake pads','Coolant level','Oil level','Other']

  return [
    {
      label: 'Tasks Done',
      items: taskItems.map(name => ({ name, result: selections['tasks']?.[name] || '', comment: comments['tasks']?.[name] || '' })).filter(i => i.result !== ''),
    },
    {
      label: 'General Checking',
      items: checkItems.map(name => ({ name, result: selections['checking']?.[name] || '', comment: comments['checking']?.[name] || '' })).filter(i => i.result !== ''),
    },
  ]
}

function buildNextService(flowData: Record<string, unknown>) {
  const serviceType = (flowData.serviceType as string) || ''
  const km = Number(flowData.currentKm || 0)
  if (!km || !serviceType) return []
  const fmt = (n: number) => n.toLocaleString()
  if (serviceType === 'Minor Service')     return [{ label: 'Minor service',     value: `${fmt(km + 10000)} km` }]
  if (serviceType === 'Major Service')     return [{ label: 'Minor service', value: `${fmt(km + 10000)} km` }, { label: 'Spark plugs', value: `${fmt(km + 20000)} km` }, { label: 'Cabin filter', value: `${fmt(km + 20000)} km` }, { label: 'Air filter', value: `${fmt(km + 20000)} km` }]
  if (serviceType === 'Brake fluid flush') return [{ label: 'Brake fluid flush', value: `${fmt(km + 30000)} km or 2 years` }]
  if (serviceType === 'Coolant flush')     return [{ label: 'Coolant flush',     value: `${fmt(km + 40000)} km or 2 years` }]
  if (serviceType === 'Spark plugs')       return [{ label: 'Spark plugs',       value: `${fmt(km + 20000)} km` }]
  return []
}

function InlinePhotos({ photos }: { photos: Photo[] }) {
  const [preview, setPreview] = useState<string | null>(null)
  if (!photos || photos.length === 0) return null
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative group">
            <img src={photo.url} alt={photo.name} onClick={() => setPreview(photo.url)}
              className="w-20 h-20 object-cover rounded-lg border border-neutral-200 cursor-pointer hover:opacity-90" />
            <a href={photo.url} download={photo.name}
              className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">↓</a>
          </div>
        ))}
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={preview} alt="Preview" className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain shadow-2xl" />
            <a href={preview} download="photo.jpg"
              className="absolute bottom-3 left-3 text-xs bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30">↓ Download</a>
            <button onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 text-sm">✕</button>
          </div>
        </div>
      )}
    </>
  )
}

function InlineVideos({ videos }: { videos: Video[] }) {
  const [preview, setPreview] = useState<string | null>(null)
  if (!videos || videos.length === 0) return null
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {videos.map((video, idx) => (
          <div key={idx} className="relative group w-20 h-20 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center cursor-pointer hover:opacity-90"
            onClick={() => setPreview(video.url)}>
            <span className="text-2xl">▶</span>
            <a href={video.url} download={video.name} onClick={e => e.stopPropagation()}
              className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">↓</a>
          </div>
        ))}
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <video src={preview} controls autoPlay className="max-w-[90vw] max-h-[80vh] rounded-xl shadow-2xl" />
            <button onClick={() => setPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 text-sm">✕</button>
          </div>
        </div>
      )}
    </>
  )
}

function DiagnosisBody({ flowData, photoMap, videoMap }: { flowData: Record<string, unknown>; photoMap: Record<string, Photo[]>; videoMap: Record<string, Video[]> }) {
  const urgencyStyles: Record<string, string> = {
    immediate:  'bg-red-50 text-red-700 border border-red-200',
    next_month: 'bg-amber-50 text-amber-700 border border-amber-200',
    can_wait:   'bg-green-50 text-green-700 border border-green-200',
  }
  const urgencyLabels: Record<string, string> = {
    immediate: 'Immediate', next_month: 'Next month', can_wait: 'Can wait',
  }
  const complaint = (flowData.complaint as string) || ''
  const findings = (flowData.findings as string) || ''
  const recommendation = (flowData.recommendation as string) || ''
  const finalNotes = (flowData.finalNotes as string) || ''
  const estimates = (flowData.estimates as { task: string; urgency: string; estCost: string; estTime: string }[]) || []
  const filledEstimates = estimates.filter(e => e.task || e.estTime)

  // Photos not tied to a specific section go at the bottom
  const knownKeys = ['complaint', 'findings']
  const remainingPhotos: Record<string, Photo[]> = Object.fromEntries(
    Object.entries(photoMap).filter(([k]) => !knownKeys.includes(k) && (photoMap[k]?.length ?? 0) > 0)
  )

  return (
    <>
      {/* Customer Complaint */}
      {complaint && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Customer Complaint</span></div>
          <div className="px-5 py-4">
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{complaint}</p>
            <InlinePhotos photos={photoMap['complaint'] || []} />
            <InlineVideos videos={videoMap['complaint'] || []} />
          </div>
        </div>
      )}

      {/* Mechanic's Findings */}
      {findings && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Mechanic&apos;s Findings</span></div>
          <div className="px-5 py-4">
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{findings}</p>
            <InlinePhotos photos={photoMap['findings'] || []} />
            <InlineVideos videos={videoMap['findings'] || []} />
          </div>
        </div>
      )}

      {/* Repair Recommendation */}
      {recommendation && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Repair Recommendation</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{recommendation}</p></div>
        </div>
      )}

      {/* Estimates table — no prices */}
      {filledEstimates.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Estimates</span></div>
          <div className="divide-y divide-neutral-100">
            <div className="grid grid-cols-3 px-5 py-2 bg-neutral-50">
              {['Task', 'Urgency', 'Est. Time'].map(h => (
                <span key={h} className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {filledEstimates.map((est, i) => (
              <div key={i} className="grid grid-cols-3 px-5 py-3 items-center">
                <span className="text-sm text-neutral-900">{est.task || '—'}</span>
                <span>
                  {est.urgency
                    ? <span className={`text-xs font-semibold px-2 py-1 rounded ${urgencyStyles[est.urgency] || 'bg-neutral-100 text-neutral-500 border border-neutral-200'}`}>{urgencyLabels[est.urgency] || est.urgency}</span>
                    : <span className="text-sm text-neutral-300">—</span>
                  }
                </span>
                <span className="text-sm text-neutral-700">{est.estTime || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {finalNotes && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Final Notes</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{finalNotes}</p></div>
        </div>
      )}

      {/* Any remaining photos not tied to a section */}
      {Object.keys(remainingPhotos).length > 0 && <PhotosSection photoMap={remainingPhotos} />}
    </>
  )
}

type JobRecord = {
  id: string
  type: string
  status: string
  odometer_km: number | null
  created_at: string
  checklist_data: Record<string, unknown> | null
  clients?: { first_name: string; last_name: string; phone: string; email: string } | null
  vehicles?: { make: string; model: string; year: string; plate: string; odometer_km: number | null } | null
}

type Company = { name: string; phone: string; address: string }

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [job, setJob] = useState<JobRecord | null>(null)
  const [company, setCompany] = useState<Company | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('*, clients(first_name, last_name, phone, email), vehicles(make, model, year, plate, odometer_km)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setJob(data as unknown as JobRecord)
        setLoading(false)
      })

    // Load company via current user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: userData } = await supabase
        .from('users')
        .select('active_company_id, company_id')
        .eq('id', user.id)
        .single()
      const companyId = userData?.active_company_id || userData?.company_id
      if (!companyId) return
      const { data: co } = await supabase
        .from('companies')
        .select('name, phone, address')
        .eq('id', companyId)
        .single()
      if (co) setCompany(co as Company)
    })
  }, [id])

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!job) return <div className="p-6 text-sm text-neutral-400">Report not found.</div>

  // Prefer sessionStorage (just-completed flow) — fallback to saved checklist_data
  const sessionRaw = typeof window !== 'undefined' ? sessionStorage.getItem('job_flow_data') : null
  let sessionData: Record<string, unknown> = {}
  try { sessionData = sessionRaw ? JSON.parse(sessionRaw) : {} } catch { /* ignore */ }
  const flowData: Record<string, unknown> = (sessionData.type === job.type ? sessionData : null)
    ?? job.checklist_data
    ?? {}

  const photoMap = (flowData.photoMap as Record<string, Photo[]>) || {}
  const videoMap = (flowData.videoMap as Record<string, Video[]>) || {}
  const jobType = job.type

  const v = job.vehicles
  const c = job.clients
  const clientName  = c ? `${c.first_name} ${c.last_name}` : '—'
  const vehicleName = v ? `${v.make} ${v.model} ${v.year}` : '—'
  const plate       = v?.plate ? `${v.plate} · NSW` : '—'
  const odo         = job.odometer_km
    ? `${job.odometer_km.toLocaleString()} km`
    : v?.odometer_km ? `${v.odometer_km.toLocaleString()} km` : '—'
  const date = new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const reportData = {
    date,
    odometer: odo,
    location: (flowData.location as string) || '—',
    client:  { name: clientName,  phone: c?.phone || '—', email: c?.email || '—' },
    vehicle: { make: vehicleName, plate,                  odometer: odo },
  }

  if (jobType === 'diagnosis') {
    return (
      <ReportShell id={id} title="Diagnosis" subtitle="Diagnosis Report" data={reportData} snapshot={flowData} company={company}>
        <DiagnosisBody flowData={flowData} photoMap={photoMap} videoMap={videoMap} />
      </ReportShell>
    )
  }

  if (jobType === 'repair') {
    return (
      <ReportShell id={id} title="Repair" subtitle="Repair Report" data={reportData} snapshot={flowData} company={company}>
        <DiagnosisBody flowData={flowData} photoMap={photoMap} videoMap={videoMap} />
      </ReportShell>
    )
  }

  if (jobType === 'service') {
    const sections = buildServiceSections(flowData)
    const nextService = buildNextService(flowData)
    const additionalNotes = (flowData.observations as string) || ''
    const typeLabel = (flowData.serviceType as string) || 'Service'
    return (
      <ReportShell id={id} title={typeLabel} subtitle="Service Report" data={reportData} snapshot={flowData} company={company}>
        <ServiceBody sections={sections} nextService={nextService} additionalNotes={additionalNotes} photoMap={photoMap} videoMap={videoMap} />
      </ReportShell>
    )
  }

  // pre_purchase (default)
  const sections = buildPrePurchaseSections(flowData)
  const additionalNotes = (flowData.finalNotes as string) || ''
  return (
    <ReportShell id={id} title="Pre-Purchase Inspection" subtitle="Inspection Report" data={reportData} snapshot={flowData} company={company}>
      <SectionsBody sections={sections} additionalNotes={additionalNotes} recommendations={[]} photoMap={photoMap} videoMap={videoMap} />
    </ReportShell>
  )
}
