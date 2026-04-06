'use client'

import { use, useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type Photo = { url: string; name: string }
type FlowData = Record<string, unknown>

type JobRecord = {
  id: string
  type: string
  status: string
  odometer_km: number | null
  created_at: string
  checklist_data: FlowData | null
  clients?: { first_name: string; last_name: string; phone: string; email: string } | null
  vehicles?: { make: string; model: string; year: string; plate: string; odometer_km: number | null } | null
}

// ── Styles ────────────────────────────────────────────────────────────────────
const RESULT_STYLES: Record<string, string> = {
  Good:          'bg-green-50 text-green-700 border border-green-200',
  Fair:          'bg-amber-50 text-amber-700 border border-amber-200',
  Poor:          'bg-red-50 text-red-600 border border-red-200',
  None:          'bg-green-50 text-green-700 border border-green-200',
  Passed:        'bg-green-50 text-green-700 border border-green-200',
  Failed:        'bg-red-50 text-red-600 border border-red-200',
  'Codes found': 'bg-red-50 text-red-600 border border-red-200',
  Minor:         'bg-amber-50 text-amber-700 border border-amber-200',
  Notable:       'bg-red-50 text-red-600 border border-red-200',
  Done:          'bg-green-50 text-green-700 border border-green-200',
  'N/A':         'bg-neutral-100 text-neutral-500 border border-neutral-200',
}

const REC_STYLES: Record<string, string> = {
  IMMEDIATE: 'bg-red-50 text-red-700 border border-red-200',
  MONITOR:   'bg-amber-50 text-amber-700 border border-amber-200',
  ADVISORY:  'bg-blue-50 text-blue-700 border border-blue-200',
}

// ── Pure helpers ──────────────────────────────────────────────────────────────
type Section = { label: string; items: { name: string; result: string; comment: string }[] }

function buildPrePurchaseSections(flowData: FlowData): Section[] {
  const DEFS = [
    { key: 'body',       label: 'Body / Exterior',       items: ['Paint condition','Body panels / dents','Windscreen / glass'] },
    { key: 'engine',     label: 'Engine / Under Hood',   items: ['Oil leaks','Fluids (coolant, oil, brakes)','Auxiliary / serpentine belt','Engine & transmission noises','Coolant hoses'] },
    { key: 'brakes',     label: 'Brakes',                items: ['Front brake pads / rotors','Rear brake pads / rotors'] },
    { key: 'suspension', label: 'Suspension / Steering', items: ['Front suspension','Rear suspension','Steering'] },
    { key: 'tyres',      label: 'Tyres',                 items: ['Front tyres','Rear tyres'] },
    { key: 'obd',        label: 'OBD Diagnostic',        items: ['Fault codes','CO2 test'] },
    { key: 'test_drive', label: 'Test Drive',            items: ['Overall behaviour','Noises / vibrations'] },
  ]
  const sel = (flowData.selections as Record<string, Record<string, string>>) || {}
  const com = (flowData.comments  as Record<string, Record<string, string>>) || {}
  return DEFS.map(d => ({
    label: d.label,
    items: d.items
      .map(name => ({ name, result: sel[d.key]?.[name] || '', comment: com[d.key]?.[name] || '' }))
      .filter(i => i.result !== ''),
  })).filter(s => s.items.length > 0)
}

function buildServiceSections(flowData: FlowData): Section[] {
  const stype = (flowData.serviceType as string) || ''
  const sel = (flowData.selections as Record<string, Record<string, string>>) || {}
  const com = (flowData.comments  as Record<string, Record<string, string>>) || {}
  const taskItems: string[] =
    stype === 'Minor Service'     ? ['Oil change','Oil filter','Oil plug washer'] :
    stype === 'Major Service'     ? ['Oil change','Oil filter','Oil plug washer','Cabin filter','Air filter','Spark plugs'] :
    stype === 'Brake fluid flush' ? ['Brake fluid replacement'] :
    stype === 'Coolant flush'     ? ['Coolant replacement'] :
    stype === 'Spark plugs'       ? ['Spark plugs replacement'] :
    stype === 'Custom'            ? ((flowData.customTasks as string[]) || []).filter(Boolean) :
    Object.keys(sel['tasks'] || {})

  return [
    { label: 'Tasks Done',       items: taskItems.map(n => ({ name: n, result: sel['tasks']?.[n] || '', comment: com['tasks']?.[n] || '' })).filter(i => i.result !== '') },
    { label: 'General Checking', items: ['Tyre condition','Brake pads','Coolant level','Oil level','Other'].map(n => ({ name: n, result: sel['checking']?.[n] || '', comment: com['checking']?.[n] || '' })).filter(i => i.result !== '') },
  ]
}

function buildNextService(flowData: FlowData) {
  const stype = (flowData.serviceType as string) || ''
  const km = Number(flowData.currentKm || 0)
  if (!km || !stype) return []
  const fmt = (n: number) => n.toLocaleString()
  if (stype === 'Minor Service')     return [{ label: 'Minor service',     value: `${fmt(km + 10000)} km` }]
  if (stype === 'Major Service')     return [{ label: 'Minor service', value: `${fmt(km + 10000)} km` }, { label: 'Spark plugs', value: `${fmt(km + 20000)} km` }, { label: 'Cabin filter', value: `${fmt(km + 20000)} km` }, { label: 'Air filter', value: `${fmt(km + 20000)} km` }]
  if (stype === 'Brake fluid flush') return [{ label: 'Brake fluid flush', value: `${fmt(km + 30000)} km or 2 years` }]
  if (stype === 'Coolant flush')     return [{ label: 'Coolant flush',     value: `${fmt(km + 40000)} km or 2 years` }]
  if (stype === 'Spark plugs')       return [{ label: 'Spark plugs',       value: `${fmt(km + 20000)} km` }]
  return []
}

function getVerdict(sections: Section[]) {
  const all = sections.flatMap(s => s.items)
  const poor = all.filter(i => ['Poor','Failed','Codes found'].includes(i.result)).length
  if (poor >= 3) return { label: 'Not recommended',         sub: `${poor} items require immediate attention.`,                                           color: 'text-red-700',   border: 'border-red-200 bg-red-50'    }
  if (poor >= 1) return { label: 'Purchase with caution',   sub: `${poor} item${poor > 1 ? 's' : ''} require${poor === 1 ? 's' : ''} immediate attention.`, color: 'text-amber-700', border: 'border-amber-200 bg-amber-50' }
  return            { label: 'Recommended for purchase',  sub: 'No critical issues found. Vehicle is in good overall condition.',                     color: 'text-green-700', border: 'border-green-200 bg-green-50' }
}

function countResults(sections: Section[]) {
  const all = sections.flatMap(s => s.items)
  return {
    good: all.filter(i => ['Good','None','Passed'].includes(i.result)).length,
    fair: all.filter(i => ['Fair','Minor'].includes(i.result)).length,
    poor: all.filter(i => ['Poor','Failed','Codes found','Notable'].includes(i.result)).length,
  }
}

// ── Photos Section ─────────────────────────────────────────────────────────────
function PhotosSection({ photoMap }: { photoMap: Record<string, Photo[]> }) {
  const [preview, setPreview] = useState<string | null>(null)
  const LABELS: Record<string, string> = {
    complaint: 'Customer Complaint', findings: "Mechanic's Findings",
    problem: 'Problem Description', diag_notes: "Mechanic's Diagnosis", result: 'Final Notes',
  }
  const SEC_LABELS: Record<string, string> = {
    body: 'Body / Exterior', engine: 'Engine / Under Hood', brakes: 'Brakes',
    suspension: 'Suspension / Steering', tyres: 'Tyres', obd: 'OBD Diagnostic', test_drive: 'Test Drive',
    tasks: 'Tasks Done', checking: 'General Checking',
  }
  function label(key: string) {
    if (LABELS[key]) return LABELS[key]
    const [sec, ...rest] = key.split('|')
    return `${SEC_LABELS[sec] || sec} — ${rest.join('|')}`
  }
  const groups = Object.entries(photoMap).filter(([, p]) => p.length > 0)
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
            <a href={preview} download="photo.jpg" className="absolute bottom-3 left-3 text-xs bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30">↓ Download</a>
            <button onClick={() => setPreview(null)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 text-sm">✕</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Pre-Purchase Body ──────────────────────────────────────────────────────────
function PrePurchaseBody({ sections, flowData, photoMap }: { sections: Section[]; flowData: FlowData; photoMap: Record<string, Photo[]> }) {
  const verdict = getVerdict(sections)
  const counts  = countResults(sections)
  const additionalNotes = (flowData.finalNotes as string) || ''
  const recs = [] as { type: string; text: string }[]

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
          <div className="bg-neutral-900 px-5 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">{section.label}</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {section.items.map(item => (
              <div key={item.name} className="flex items-start justify-between px-5 py-3">
                <div className="flex-1 pr-4">
                  <div className="text-sm font-semibold text-neutral-900">{item.name}</div>
                  {item.comment
                    ? <div className="text-xs italic text-neutral-500 mt-0.5">{item.comment}</div>
                    : <div className="text-xs text-neutral-300 mt-0.5">—</div>}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded flex-shrink-0 ${RESULT_STYLES[item.result] || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {additionalNotes && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Additional Notes</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed">{additionalNotes}</p></div>
        </div>
      )}
      {recs.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Recommendations</span></div>
          <div className="divide-y divide-neutral-100">
            {recs.map((rec, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3">
                <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${REC_STYLES[rec.type] || 'bg-neutral-100 text-neutral-600'}`}>{rec.type}</span>
                <span className="text-sm text-neutral-700">{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <PhotosSection photoMap={photoMap} />
    </>
  )
}

// ── Service Body ───────────────────────────────────────────────────────────────
function ServiceBody({ sections, nextService, flowData, photoMap }: { sections: Section[]; nextService: { label: string; value: string }[]; flowData: FlowData; photoMap: Record<string, Photo[]> }) {
  const allItems = sections.flatMap(s => s.items)
  const done = allItems.filter(i => i.result === 'Done').length
  const attention = allItems.filter(i => ['Poor','Fair','Failed','Codes found'].includes(i.result)).length
  const additionalNotes = (flowData.observations as string) || ''

  return (
    <>
      <div className="mx-5 my-4 rounded-lg border border-green-200 bg-green-50 px-5 py-4">
        <div className="flex items-center gap-6">
          <div><div className="text-2xl font-bold text-green-700">{done}</div><div className="text-xs text-neutral-400">Completed</div></div>
          {attention > 0 && <div><div className="text-2xl font-bold text-amber-700">{attention}</div><div className="text-xs text-neutral-400">Need attention</div></div>}
          <div className={`text-sm font-medium ${attention > 0 ? 'text-amber-700' : 'text-green-700'}`}>
            {attention > 0 ? `${attention} item${attention > 1 ? 's' : ''} flagged` : 'Service completed successfully'}
          </div>
        </div>
      </div>
      {sections.map(section => (
        <div key={section.label} className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">{section.label}</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {section.items.map(item => (
              <div key={item.name} className="flex items-start justify-between px-5 py-3">
                <div className="flex-1 pr-4">
                  <div className="text-sm font-semibold text-neutral-900">{item.name}</div>
                  {item.comment && <div className="text-xs italic text-neutral-500 mt-0.5">{item.comment}</div>}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded flex-shrink-0 ${RESULT_STYLES[item.result] || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
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
      <PhotosSection photoMap={photoMap} />
    </>
  )
}

// ── Diagnosis Body ─────────────────────────────────────────────────────────────
function DiagnosisBody({ flowData, photoMap }: { flowData: FlowData; photoMap: Record<string, Photo[]> }) {
  const urgencyStyles: Record<string, string> = {
    immediate:  'bg-red-50 text-red-700 border border-red-200',
    next_month: 'bg-amber-50 text-amber-700 border border-amber-200',
    can_wait:   'bg-green-50 text-green-700 border border-green-200',
  }
  const urgencyLabels: Record<string, string> = { immediate: 'Immediate', next_month: 'Next month', can_wait: 'Can wait' }

  const complaint  = (flowData.complaint  as string) || ''
  const findings   = (flowData.findings   as string) || ''
  const recommendation = (flowData.recommendation as string) || ''
  const estimates  = (flowData.estimates as { task: string; urgency: string; estCost: string; estTime: string }[]) || []
  const filledEst  = estimates.filter(e => e.task || e.estTime)

  return (
    <>
      {complaint && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Customer Complaint</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed">{complaint}</p></div>
        </div>
      )}
      {findings && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Mechanic&apos;s Findings</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed">{findings}</p></div>
        </div>
      )}
      {filledEst.length > 0 && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Repair Estimates</span></div>
          <div>
            <div className="grid grid-cols-3 px-5 py-2 border-b border-neutral-100 bg-neutral-50">
              {['Task','Urgency','Est. Time'].map(h => <span key={h} className="text-xs font-medium text-neutral-500">{h}</span>)}
            </div>
            {filledEst.map((est, i) => (
              <div key={i} className="grid grid-cols-3 px-5 py-3 border-b border-neutral-100 last:border-0 items-center">
                <span className="text-sm text-neutral-900">{est.task || '—'}</span>
                <span>{est.urgency ? <span className={`text-xs font-semibold px-2 py-1 rounded ${urgencyStyles[est.urgency] || 'bg-neutral-100 text-neutral-500 border border-neutral-200'}`}>{urgencyLabels[est.urgency] || est.urgency}</span> : <span className="text-sm text-neutral-300">—</span>}</span>
                <span className="text-sm text-neutral-700">{est.estTime || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {recommendation && (
        <div className="border-t border-neutral-100">
          <div className="bg-neutral-900 px-5 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-white">Mechanic&apos;s Recommendation</span></div>
          <div className="px-5 py-4"><p className="text-sm text-neutral-700 leading-relaxed">{recommendation}</p></div>
        </div>
      )}
      <PhotosSection photoMap={photoMap} />
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [job, setJob] = useState<JobRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public-report/${token}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) { setNotFound(true) }
        else { setJob(data as JobRecord) }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-sm text-neutral-400">Loading report…</div>
    </div>
  )
  if (notFound || !job) return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-sm text-neutral-500">Report not found or link has expired.</div>
    </div>
  )

  const flowData: FlowData = job.checklist_data || {}
  const photoMap = (flowData.photoMap as Record<string, Photo[]>) || {}
  const jobType = job.type

  // Use RLS-joined data if available, otherwise fall back to embedded snapshot in checklist_data
  const snapC = flowData._client as { first_name: string; last_name: string; phone: string; email: string } | null
  const snapV = flowData._vehicle as { make: string; model: string; year: string; plate: string; odometer_km: number | null } | null
  const c = job.clients ?? snapC
  const v = job.vehicles ?? snapV

  const clientName  = c ? `${c.first_name} ${c.last_name}` : '—'
  const vehicleName = v ? `${v.make} ${v.model} ${v.year}` : '—'
  const plate       = v?.plate || '—'
  const odo         = job.odometer_km
    ? `${job.odometer_km.toLocaleString()} km`
    : v?.odometer_km ? `${v.odometer_km.toLocaleString()} km` : '—'
  const date = new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const TYPE_LABELS: Record<string, string> = {
    pre_purchase: 'Pre-Purchase Inspection',
    service:      (flowData.serviceType as string) || 'Service',
    diagnosis:    'Diagnosis',
    repair:       'Repair',
  }
  const titleLabel = TYPE_LABELS[jobType] || jobType

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
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
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 no-print">
          <div className="text-xs text-neutral-400">Same Day Car Repair · Inspection Report</div>
          <button onClick={() => window.print()}
            className="text-sm px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">
            Download PDF
          </button>
        </div>

        {/* Report */}
        <div id="report-printable" className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="bg-neutral-900 px-6 py-5">
            <div className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1">
              {jobType === 'service' ? 'SERVICE REPORT' : jobType === 'diagnosis' ? 'DIAGNOSIS REPORT' : 'INSPECTION REPORT'}
            </div>
            <div className="text-xl font-bold text-white">{titleLabel}</div>
            <div className="text-xs text-neutral-400 mt-1">Same Day Car Repair · Mobile Mechanic · 0439 269 598</div>
          </div>

          {/* Meta bar */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 border-b border-neutral-100 bg-neutral-50">
            <div><span className="text-neutral-400 text-xs block">Date</span><div className="font-semibold text-neutral-900 text-sm">{date}</div></div>
          </div>

          {/* Client + Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-neutral-100">
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-neutral-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-white bg-green-700 px-3 py-1.5 rounded mb-3 inline-block">Client Information</div>
              {[
                { label: 'Client Name', value: clientName },
                { label: 'Phone',       value: c?.phone || '—' },
                { label: 'Email',       value: c?.email || '—' },
              ].map(row => (
                <div key={row.label} className="py-1">
                  <span className="text-xs text-neutral-400 block">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-900 break-all">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 px-3 py-1.5 rounded mb-3 inline-block">Vehicle Information</div>
              {[
                { label: 'Vehicle',      value: vehicleName },
                { label: 'Plate / Rego', value: plate },
                { label: 'Odometer',     value: odo },
              ].map(row => (
                <div key={row.label} className="py-1">
                  <span className="text-xs text-neutral-400 block">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          {jobType === 'pre_purchase' && (
            <PrePurchaseBody
              sections={buildPrePurchaseSections(flowData)}
              flowData={flowData}
              photoMap={photoMap}
            />
          )}
          {jobType === 'service' && (
            <ServiceBody
              sections={buildServiceSections(flowData)}
              nextService={buildNextService(flowData)}
              flowData={flowData}
              photoMap={photoMap}
            />
          )}
          {jobType === 'diagnosis' && (
            <DiagnosisBody flowData={flowData} photoMap={photoMap} />
          )}
          {jobType === 'repair' && (
            <DiagnosisBody flowData={flowData} photoMap={photoMap} />
          )}

          {/* Disclaimer */}
          <div className="border-t border-neutral-100 px-5 py-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              DISCLAIMER: This report is based on a visual and functional inspection performed at the time of service. It is provided for informational purposes only and does not constitute a guarantee of the vehicle&apos;s condition, past history, or future performance. Same Day Car Repair accepts no liability for any issues that may arise after the inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
