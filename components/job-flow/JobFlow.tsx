'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── PHOTO PICKER ──────────────────────────────────────────────────────────────
type Photo = { url: string; name: string }

function PhotoPicker({ photos, onChange }: { photos: Photo[]; onChange: (photos: Photo[]) => void }) {
  const [preview, setPreview] = useState<string | null>(null)

  function readFiles(files: FileList | null, onDone: (results: Photo[]) => void) {
    if (!files) return
    const arr = Array.from(files)
    const results: Photo[] = []
    let done = 0
    arr.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        results.push({ url: e.target?.result as string, name: file.name })
        done++
        if (done === arr.length) onDone(results)
      }
      reader.readAsDataURL(file)
    })
  }

  function addFiles(files: FileList | null) {
    readFiles(files, results => onChange([...photos, ...results]))
  }

  function replacePhoto(idx: number, files: FileList | null) {
    readFiles(files, results => {
      if (!results[0]) return
      onChange(photos.map((p, i) => i === idx ? results[0] : p))
    })
  }

  function removePhoto(idx: number) {
    onChange(photos.filter((_, i) => i !== idx))
    setPreview(null)
  }

  return (
    <div className="mt-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group w-16 h-16 flex-shrink-0">
              <img src={photo.url} alt={photo.name} onClick={() => setPreview(photo.url)}
                className="w-full h-full object-cover rounded-lg border border-neutral-200 cursor-pointer" />
              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <label className="cursor-pointer text-white bg-black/60 rounded px-1.5 py-1 text-xs hover:bg-black/80" title="Replace">
                  ↺ <input type="file" accept="image/*" className="hidden" onChange={e => { replacePhoto(idx, e.target.files); (e.target as HTMLInputElement).value = '' }} />
                </label>
                <button onClick={() => removePhoto(idx)} className="text-white bg-red-500/90 rounded px-1.5 py-1 text-xs hover:bg-red-600" title="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <label className="text-xs px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-500 hover:text-neutral-500 cursor-pointer">
          📷 Camera <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        <label className="text-xs px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-500 hover:text-neutral-500 cursor-pointer">
          🖼️ Gallery <input type="file" accept="image/*" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img src={preview} alt="Preview" className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setPreview(null)} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 text-sm">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
export const FLOW_CONFIG = {
  pre_purchase: {
    title: 'Pre-Purchase Inspection',
    sections: [
      { key: 'body',       label: 'Body / Exterior',       items: [{ name: 'Paint condition', options: ['Good','Fair','Poor'] }, { name: 'Body panels / dents', options: ['Good','Fair','Poor'] }, { name: 'Windscreen / glass', options: ['Good','Fair','Poor'] }] },
      { key: 'engine',     label: 'Engine / Under Hood',   items: [{ name: 'Oil leaks', options: ['Good','Fair','Poor'] }, { name: 'Fluids (coolant, oil, brakes)', options: ['Good','Fair','Poor'] }, { name: 'Auxiliary / serpentine belt', options: ['Good','Fair','Poor'] }, { name: 'Engine & transmission noises', options: ['Good','Fair','Poor'] }, { name: 'Coolant hoses', options: ['Good','Fair','Poor'] }] },
      { key: 'brakes',     label: 'Brakes',                items: [{ name: 'Front brake pads / rotors', options: ['Good','Fair','Poor'] }, { name: 'Rear brake pads / rotors', options: ['Good','Fair','Poor'] }] },
      { key: 'suspension', label: 'Suspension / Steering', items: [{ name: 'Front suspension', options: ['Good','Fair','Poor'] }, { name: 'Rear suspension', options: ['Good','Fair','Poor'] }, { name: 'Steering', options: ['Good','Fair','Poor'] }] },
      { key: 'tyres',      label: 'Tyres',                 items: [{ name: 'Front tyres', options: ['Good','Fair','Poor'] }, { name: 'Rear tyres', options: ['Good','Fair','Poor'] }] },
      { key: 'obd',        label: 'OBD Diagnostic',        items: [{ name: 'Fault codes', options: ['None','Codes found'] }, { name: 'CO2 test', options: ['Passed','Failed'] }] },
      { key: 'test_drive', label: 'Test Drive',            items: [{ name: 'Overall behaviour', options: ['Good','Fair','Poor'] }, { name: 'Noises / vibrations', options: ['None','Minor','Notable'] }] },
    ],
  },
  service: {
    title: 'Service',
    sections: [
      { key: 'service_type', label: 'Service Type',         items: [] },
      { key: 'tasks',        label: 'Tasks Done',           items: [{ name: 'Oil change', options: ['Done','N/A'] }, { name: 'Oil filter', options: ['Done','N/A'] }, { name: 'Oil plug washer', options: ['Done','N/A'] }] },
      { key: 'checking',     label: 'General Checking',     items: [{ name: 'Tyre condition', options: ['Good','Fair','Poor'] }, { name: 'Brake pads', options: ['Good','Fair','Poor'] }, { name: 'Coolant level', options: ['Good','Fair','Poor'] }, { name: 'Oil level', options: ['Good','Fair','Poor'] }, { name: 'Other', options: ['Good','Fair','Poor'] }] },
      { key: 'observations', label: 'Observations',         items: [] },
      { key: 'alerts',       label: 'Next Service Alerts',  items: [] },
    ],
  },
  diagnosis: {
    title: 'Diagnosis',
    sections: [
      { key: 'complaint', label: 'Customer Complaint', items: [] },
      { key: 'findings',  label: 'Mechanic Findings',  items: [] },
      { key: 'outcome',   label: 'Outcome',            items: [] },
    ],
  },
  repair: {
    title: 'Repair',
    sections: [
      { key: 'problem',    label: 'Problem',             items: [] },
      { key: 'diag_notes', label: "Mechanic's Diagnosis", items: [] },
      { key: 'parts',      label: 'Parts & Labour',      items: [] },
      { key: 'result',     label: 'Result',              items: [] },
    ],
  },
}

// ── OPTION STYLES ─────────────────────────────────────────────────────────────
const OPTION_STYLES: Record<string, string> = {
  Good: 'bg-green-50 text-green-700 border-green-300', Fair: 'bg-amber-50 text-amber-700 border-amber-300',
  Poor: 'bg-red-50 text-red-600 border-red-300', None: 'bg-green-50 text-green-700 border-green-300',
  Passed: 'bg-green-50 text-green-700 border-green-300', Failed: 'bg-red-50 text-red-600 border-red-300',
  'Codes found': 'bg-red-50 text-red-600 border-red-300', Minor: 'bg-amber-50 text-amber-700 border-amber-300',
  Notable: 'bg-red-50 text-red-600 border-red-300', Done: 'bg-green-50 text-green-700 border-green-300',
  'N/A': 'bg-neutral-100 text-neutral-500 border-neutral-300',
}

// ── CHECKLIST ITEM ────────────────────────────────────────────────────────────
function ChecklistItem({ name, options, selected, comment, onSelect, onComment, photos, onPhotosChange }: {
  name: string; options: string[]; selected?: string; comment: string
  onSelect: (opt: string) => void; onComment: (val: string) => void
  photos: Photo[]; onPhotosChange: (p: Photo[]) => void
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm font-medium text-neutral-900">{name}</span>
        <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
          {options.map(opt => (
            <button key={opt} onClick={() => onSelect(selected === opt ? '' : opt)}
              className={`text-xs px-3 py-2 rounded-full border font-medium transition-colors ${selected === opt ? OPTION_STYLES[opt] || 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <input type="text" value={comment} onChange={e => onComment(e.target.value)}
        placeholder="Optional comment..."
        className="w-full text-base px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-neutral-400" />
      <PhotoPicker photos={photos} onChange={onPhotosChange} />
    </div>
  )
}

// ── PROPS ─────────────────────────────────────────────────────────────────────
interface JobFlowProps {
  type: string
  jobId?: string
  clientId?: string
  vehicleId?: string
  vehicle?: string
  plate?: string
  initialDone?: Set<string>
  initialServiceSubtype?: string
  onComplete: () => void
  onAutoSave?: (data: object) => void
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function JobFlow({ type, jobId, clientId, vehicleId, vehicle, plate, initialDone = new Set(), initialServiceSubtype = '', onComplete, onAutoSave }: JobFlowProps) {
  const router = useRouter()
  const config = FLOW_CONFIG[type as keyof typeof FLOW_CONFIG] || FLOW_CONFIG.pre_purchase
  const sections = config.sections
  const contentRef = useRef<HTMLDivElement>(null)
  const pillsRef = useRef<HTMLDivElement>(null)

  // If a service subtype was pre-selected, mark service_type as done and start at tasks
  const computedInitialDone = initialServiceSubtype
    ? new Set([...initialDone, 'service_type'])
    : new Set(initialDone)

  // Shared state
  const [activeIdx, setActiveIdx] = useState(() => {
    const firstPending = sections.findIndex(s => !computedInitialDone.has(s.key))
    return firstPending === -1 ? 0 : firstPending
  })
  const [doneSections, setDoneSections] = useState<Set<string>>(computedInitialDone)
  const [selections, setSelections] = useState<Record<string, Record<string, string>>>({})
  const [comments, setComments] = useState<Record<string, Record<string, string>>>({})
  const [photoMap, setPhotoMap] = useState<Record<string, Photo[]>>({})
  function ph(key: string) { return photoMap[key] || [] }
  function setPh(key: string, photos: Photo[]) { setPhotoMap(prev => ({ ...prev, [key]: photos })) }

  // Pre-purchase state
  const [inspectionFee, setInspectionFee] = useState('')

  // Service state
  const [serviceFee, setServiceFee] = useState('')
  const [serviceType, setServiceType] = useState(initialServiceSubtype)
  const [currentKm, setCurrentKm] = useState('')
  const [observations, setObservations] = useState('')
  const [alertService, setAlertService] = useState(true)
  const [alertBrakes, setAlertBrakes] = useState(false)
  const [customTasks, setCustomTasks] = useState<string[]>([''])  // names for Custom service type

  // Diagnosis state
  const [diagFee, setDiagFee] = useState('80')
  const [complaint, setComplaint] = useState('')
  const [findings, setFindings] = useState('')
  const [recommendation, setRecommendation] = useState('')
  type Estimate = { task: string; urgency: string; estCost: string; estTime: string }
  type Part     = { name: string; qty: number; price: string }

  const [estimates, setEstimates] = useState<Estimate[]>([{ task: '', urgency: '', estCost: '', estTime: '' }])

  // Repair state
  const [repairSource, setRepairSource] = useState<string>('customer')
  const [problem, setProblem] = useState<string>('')
  const [diagNotes, setDiagNotes] = useState<string>('')
  const [parts, setParts] = useState<Part[]>([{ name: '', qty: 1, price: '' }])
  const [labour, setLabour] = useState<string>('')
  const [repairResult, setRepairResult] = useState<string>('')
  const [finalNotes, setFinalNotes] = useState<string>('')

  // Restore saved state on client mount (after SSR hydration)
  useEffect(() => {
    const raw = jobId
      ? sessionStorage.getItem(`job_flow_${jobId}_state`)
      : localStorage.getItem(`job_new_draft_${type}_state`)
    if (!raw) return
    try {
      const s = JSON.parse(raw)
      // For new jobs, discard draft if it belongs to a different client/vehicle
      if (!jobId) {
        if ((clientId && s._clientId && s._clientId !== clientId) ||
            (vehicleId && s._vehicleId && s._vehicleId !== vehicleId)) {
          localStorage.removeItem(`job_new_draft_${type}_state`)
          localStorage.removeItem(`job_draft_id_${type}`)
          return
        }
      }
      if (s.selections)   setSelections(s.selections)
      if (s.comments)     setComments(s.comments)
      if (s.photoMap)     setPhotoMap(s.photoMap)
      if (s.inspectionFee !== undefined) setInspectionFee(s.inspectionFee)
      if (s.serviceFee    !== undefined) setServiceFee(s.serviceFee)
      if (s.serviceType   !== undefined) setServiceType(s.serviceType || initialServiceSubtype)
      if (s.currentKm     !== undefined) setCurrentKm(s.currentKm)
      if (s.observations  !== undefined) setObservations(s.observations)
      if (s.alertService  !== undefined) setAlertService(s.alertService)
      if (s.alertBrakes   !== undefined) setAlertBrakes(s.alertBrakes)
      if (s.customTasks   !== undefined) setCustomTasks(s.customTasks)
      if (s.diagFee       !== undefined) setDiagFee(s.diagFee)
      if (s.complaint     !== undefined) setComplaint(s.complaint)
      if (s.findings      !== undefined) setFindings(s.findings)
      if (s.recommendation !== undefined) setRecommendation(s.recommendation)
      if (s.estimates     !== undefined) setEstimates(s.estimates)
      if (s.repairSource  !== undefined) setRepairSource(s.repairSource)
      if (s.problem       !== undefined) setProblem(s.problem)
      if (s.diagNotes     !== undefined) setDiagNotes(s.diagNotes)
      if (s.parts         !== undefined) setParts(s.parts)
      if (s.labour        !== undefined) setLabour(s.labour)
      if (s.repairResult  !== undefined) setRepairResult(s.repairResult)
      if (s.finalNotes    !== undefined) setFinalNotes(s.finalNotes)
      if (!jobId && s.activeIdx !== undefined) {
        // Clamp to valid range to prevent crash if sections count changed
        setActiveIdx(Math.min(s.activeIdx, sections.length - 1))
      }
      if (!jobId && s.doneSections) setDoneSections(new Set(s.doneSections))
    } catch {}
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save on unmount (e.g. user navigates to another tab mid-flow)
  const saveOnUnmountRef = useRef<() => void>(() => {})
  saveOnUnmountRef.current = () => {
    if (jobId) return
    try {
      const flowData = buildFlowData()
      localStorage.setItem(`job_new_draft_${type}_state`, JSON.stringify({
        ...flowData,
        activeIdx,
        doneSections: [...doneSections],
        _clientId: clientId,
        _vehicleId: vehicleId,
      }))
    } catch { /* quota exceeded */ }
  }
  useEffect(() => {
    return () => { saveOnUnmountRef.current() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const partsTotal = parts.reduce((sum: number, p: Part) => sum + (Number(p.price) * p.qty || 0), 0)
  const grandTotal = partsTotal + (Number(labour) || 0)

  const activeSection = sections[activeIdx]
  const progress = Math.round((doneSections.size / sections.length) * 100)

  function select(sectionKey: string, itemName: string, option: string) {
    const current = selections[sectionKey]?.[itemName]
    setSelections(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [itemName]: current === option ? '' : option } }))
  }
  function setComment(sectionKey: string, itemName: string, val: string) {
    setComments(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [itemName]: val } }))
  }

  function buildFlowData() {
    return {
      type, serviceType, serviceFee, inspectionFee, currentKm, observations,
      alertService, alertBrakes, customTasks, diagFee, complaint, findings, recommendation,
      estimates, repairSource, problem, diagNotes, parts, labour, repairResult,
      finalNotes, selections, comments, photoMap,
    }
  }

  function handleNext() {
    const updatedDone = new Set([...doneSections, activeSection.key])
    setDoneSections(updatedDone)
    const flowData = buildFlowData()
    if (jobId) {
      sessionStorage.setItem(`job_flow_${jobId}_done`,  JSON.stringify([...updatedDone]))
      sessionStorage.setItem(`job_flow_${jobId}_state`, JSON.stringify(flowData))
    } else {
      // Persist new-job draft to localStorage (survives tab close + refresh)
      try {
        localStorage.setItem(`job_new_draft_${type}_state`, JSON.stringify({
          ...flowData,
          activeIdx: activeIdx + 1,
          doneSections: [...updatedDone],
          _clientId: clientId,
          _vehicleId: vehicleId,
        }))
      } catch { /* quota exceeded — ignore */ }
      onAutoSave?.(flowData)
    }
    sessionStorage.setItem('job_flow_data', JSON.stringify(flowData))
    if (activeIdx < sections.length - 1) {
      setActiveIdx(activeIdx + 1)
      // Scroll content to top
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        // Scroll active pill into view
        const pills = pillsRef.current
        if (pills) {
          const activePill = pills.children[activeIdx + 1] as HTMLElement
          activePill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        }
      }, 50)
    } else {
      onComplete()
    }
  }

  // ── Sidebar (desktop only) ─────────────────────────────────────────────────
  const sidebar = (
    <div className="hidden md:flex w-52 flex-shrink-0 bg-white border-r border-neutral-200 flex-col">
      <div className="px-4 py-4 border-b border-neutral-100">
        <div className="text-xs font-medium text-neutral-900 mb-1">{config.title}</div>
        <div className="text-xs text-neutral-500 mb-2">Section {activeIdx + 1} of {sections.length}</div>
        <div className="h-1.5 bg-neutral-100 rounded-full">
          <div className="h-1.5 bg-neutral-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <nav className="flex-1 py-2">
        {sections.map((s, idx) => {
          const isDone = doneSections.has(s.key)
          const isCurrent = idx === activeIdx
          return (
            <button key={s.key} onClick={() => (isDone || isCurrent) && setActiveIdx(idx)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left border-l-2 transition-colors ${isCurrent ? 'border-neutral-900 bg-neutral-50 text-neutral-900 font-medium' : isDone ? 'border-transparent text-neutral-400 hover:bg-neutral-50 cursor-pointer' : 'border-transparent text-neutral-300 cursor-not-allowed'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${isDone ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-300'}`}>
                {isDone ? '✓' : idx + 1}
              </span>
              {s.label}
            </button>
          )
        })}
      </nav>
      <div className="p-4 border-t border-neutral-100">
        <button onClick={() => router.push(jobId ? `/jobs/${jobId}` : '/jobs')}
          className="w-full text-xs text-neutral-400 hover:text-neutral-600 text-center">
          Save & exit
        </button>
      </div>
    </div>
  )

  // ── Mobile top bar ─────────────────────────────────────────────────────────
  const mobileTopBar = (
    <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => router.push(jobId ? `/jobs/${jobId}` : '/jobs')}
          className="text-sm text-neutral-500 active:text-neutral-900">
          ← Exit
        </button>
        <span className="text-xs font-medium text-neutral-500">{activeIdx + 1} / {sections.length}</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-neutral-100 rounded-full mb-2">
        <div className="h-1.5 bg-neutral-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      {/* Step pills — scrollable */}
      <div ref={pillsRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {sections.map((s, idx) => {
          const isDone = doneSections.has(s.key)
          const isCurrent = idx === activeIdx
          return (
            <button key={s.key}
              onClick={() => (isDone || isCurrent) && setActiveIdx(idx)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                isCurrent ? 'bg-neutral-900 text-white border-neutral-900' :
                isDone ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-neutral-50 text-neutral-300 border-neutral-200'
              }`}>
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                isCurrent ? 'bg-white/20' : isDone ? 'bg-green-100' : 'bg-neutral-200'
              }`}>
                {isDone ? '✓' : idx + 1}
              </span>
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Section header ─────────────────────────────────────────────────────────
  const sectionHeader = (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-neutral-900">{activeSection.label}</h2>
      {vehicle && <p className="text-sm text-neutral-500 mt-1">{vehicle}{plate ? ` · ${plate}` : ''}</p>}
      {doneSections.has(activeSection.key) && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-xs text-green-700 font-medium">
          ✓ This section was already completed. You can review or edit below.
        </div>
      )}
    </div>
  )

  // ── Navigation buttons ─────────────────────────────────────────────────────
  const navButtons = (
    <div className="flex items-center justify-between mt-6 gap-3">
      <button onClick={() => activeIdx > 0 && setActiveIdx(activeIdx - 1)} disabled={activeIdx === 0}
        className="flex-1 md:flex-none text-sm px-4 py-3 md:py-2 border border-neutral-200 rounded-xl md:rounded-lg hover:bg-neutral-50 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed">
        ← Previous
      </button>
      <button onClick={handleNext}
        className="flex-1 md:flex-none text-sm px-5 py-3 md:py-2 bg-neutral-900 text-white rounded-xl md:rounded-lg hover:bg-neutral-700 transition-colors font-medium">
        {activeIdx === sections.length - 1 ? (jobId ? 'Generate report →' : 'Finish →') : 'Next →'}
      </button>
    </div>
  )

  // ── Section content ────────────────────────────────────────────────────────
  function renderContent() {
    const key = activeSection.key

    // Pre-purchase: pure checklist
    if (type === 'pre_purchase') {
      const items = (activeSection as typeof FLOW_CONFIG.pre_purchase.sections[0]).items || []
      return (
        <div className="space-y-4">
          {key === 'body' && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <label className="text-xs text-neutral-500 mb-1 block">Inspection fee ($)</label>
              <input type="number" value={inspectionFee} onChange={e => setInspectionFee(e.target.value)}
                placeholder="e.g. 180"
                className="w-full text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none focus:border-neutral-400" />
            </div>
          )}
          {items.map(item => (
            <ChecklistItem key={item.name} name={item.name} options={item.options}
              selected={selections[key]?.[item.name]} comment={comments[key]?.[item.name] || ''}
              onSelect={opt => select(key, item.name, opt)}
              onComment={val => setComment(key, item.name, val)}
              photos={ph(`${key}|${item.name}`)}
              onPhotosChange={ps => setPh(`${key}|${item.name}`, ps)} />
          ))}
        </div>
      )
    }

    // Service
    if (type === 'service') {
      if (key === 'service_type') {
        const fmt = (n: number) => n.toLocaleString()
        const km = Number(currentKm)
        const SERVICE_TYPES = [
          { key: 'Minor Service',      desc: 'Oil + oil filter' },
          { key: 'Major Service',      desc: 'Oil + filters + extras' },
          { key: 'Brake fluid flush',  desc: 'Full system flush' },
          { key: 'Coolant flush',      desc: 'Coolant replacement' },
          { key: 'Spark plugs',        desc: 'Plugs replacement' },
          { key: 'Custom',             desc: 'Define manually' },
        ]
        const recRows: { label: string; value: string }[] =
          serviceType === 'Minor Service'     ? [{ label: 'Minor service',     value: `${fmt(km + 10000)} km` }] :
          serviceType === 'Major Service'     ? [{ label: 'Minor service', value: `${fmt(km + 10000)} km` }, { label: 'Spark plugs', value: `${fmt(km + 20000)} km` }, { label: 'Cabin filter', value: `${fmt(km + 20000)} km` }, { label: 'Air filter', value: `${fmt(km + 20000)} km` }] :
          serviceType === 'Brake fluid flush' ? [{ label: 'Brake fluid flush', value: `${fmt(km + 30000)} km or 2 years` }] :
          serviceType === 'Coolant flush'     ? [{ label: 'Coolant flush',     value: `${fmt(km + 40000)} km or 2 years` }] :
          serviceType === 'Spark plugs'       ? [{ label: 'Spark plugs',       value: `${fmt(km + 20000)} km` }] : []
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPES.map(t => (
                <button key={t.key} onClick={() => setServiceType(serviceType === t.key ? '' : t.key)}
                  className={`p-4 rounded-xl border text-left transition-colors ${serviceType === t.key ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                  <div className="text-sm font-medium text-neutral-900">{t.key}</div>
                  <div className="text-xs text-neutral-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <label className="text-xs text-neutral-500 mb-1 block">Service fee ($)</label>
                <input type="number" value={serviceFee} onChange={e => setServiceFee(e.target.value)} placeholder="e.g. 120"
                  className="w-full text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none focus:border-neutral-400" />
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <label className="text-xs text-neutral-500 mb-1 block">Current odometer (km)</label>
                <input type="number" value={currentKm} onChange={e => setCurrentKm(e.target.value)} placeholder="e.g. 85000"
                  className="w-full text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            {currentKm && km > 0 && recRows.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">Next {serviceType} recommendation</div>
                <div className="space-y-2">
                  {recRows.map(row => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-700">{row.label}</span>
                      <span className="font-medium text-neutral-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }
      if (key === 'tasks') {
        const taskItems: { name: string; options: string[] }[] =
          serviceType === 'Minor Service' ? [
            { name: 'Oil change',       options: ['Done','N/A'] },
            { name: 'Oil filter',       options: ['Done','N/A'] },
            { name: 'Oil plug washer',  options: ['Done','N/A'] },
          ] :
          serviceType === 'Major Service' ? [
            { name: 'Oil change',       options: ['Done','N/A'] },
            { name: 'Oil filter',       options: ['Done','N/A'] },
            { name: 'Oil plug washer',  options: ['Done','N/A'] },
            { name: 'Cabin filter',     options: ['Done','N/A'] },
            { name: 'Air filter',       options: ['Done','N/A'] },
            { name: 'Spark plugs',      options: ['Done','N/A'] },
          ] :
          serviceType === 'Brake fluid flush' ? [
            { name: 'Brake fluid replacement', options: ['Done','N/A'] },
          ] :
          serviceType === 'Coolant flush' ? [
            { name: 'Coolant replacement', options: ['Done','N/A'] },
          ] :
          serviceType === 'Spark plugs' ? [
            { name: 'Spark plugs replacement', options: ['Done','N/A'] },
          ] :
          // Custom — rendered separately below
          []

        if (serviceType === 'Custom') {
          return (
            <div className="space-y-3">
              {customTasks.map((taskName, idx) => (
                <div key={idx} className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
                  <input
                    type="text"
                    value={taskName}
                    onChange={e => {
                      const updated = customTasks.map((t, i) => i === idx ? e.target.value : t)
                      setCustomTasks(updated)
                    }}
                    placeholder="Task name..."
                    className="flex-1 text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none focus:border-neutral-400"
                  />
                  <div className="flex gap-2 flex-shrink-0">
                    {(['Done', 'N/A'] as const).map(opt => (
                      <button key={opt} onClick={() => select(key, taskName || `task_${idx}`, opt)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          selections[key]?.[taskName || `task_${idx}`] === opt
                            ? opt === 'Done' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-neutral-100 text-neutral-500 border-neutral-300'
                            : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCustomTasks(customTasks.filter((_, i) => i !== idx))}
                    className="text-neutral-300 hover:text-red-400 text-lg leading-none flex-shrink-0">
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => setCustomTasks([...customTasks, ''])}
                className="w-full py-2.5 border border-dashed border-neutral-300 rounded-xl text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-500 transition-colors">
                + Add task
              </button>
            </div>
          )
        }

        return (
          <div className="space-y-4">
            {taskItems.map(item => (
              <ChecklistItem key={item.name} name={item.name} options={item.options}
                selected={selections[key]?.[item.name]} comment={comments[key]?.[item.name] || ''}
                onSelect={opt => select(key, item.name, opt)}
                onComment={val => setComment(key, item.name, val)}
                photos={ph(`${key}|${item.name}`)}
                onPhotosChange={ps => setPh(`${key}|${item.name}`, ps)} />
            ))}
          </div>
        )
      }
      if (key === 'checking') {
        const checkItems = FLOW_CONFIG.service.sections.find(s => s.key === 'checking')?.items || []
        return (
          <div className="space-y-4">
            {checkItems.map(item => (
              <ChecklistItem key={item.name} name={item.name} options={item.options}
                selected={selections[key]?.[item.name]} comment={comments[key]?.[item.name] || ''}
                onSelect={opt => select(key, item.name, opt)}
                onComment={val => setComment(key, item.name, val)}
                photos={ph(`${key}|${item.name}`)}
                onPhotosChange={ps => setPh(`${key}|${item.name}`, ps)} />
            ))}
          </div>
        )
      }
      if (key === 'observations') {
        return (
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Observations & recommendations</label>
            <textarea value={observations} onChange={e => setObservations(e.target.value)}
              placeholder="Additional observations..." rows={5}
              className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
          </div>
        )
      }
      if (key === 'alerts') {
        return (
          <div className="space-y-3">
            <div className="bg-white border border-neutral-200 rounded-xl px-4 divide-y divide-neutral-100">
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm text-neutral-900">Remind before next service</div>
                  <div className="text-xs text-neutral-400">2 weeks before due date</div>
                </div>
                <button onClick={() => setAlertService(!alertService)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${alertService ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${alertService ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm text-neutral-900">Follow up — brake pads</div>
                  <div className="text-xs text-neutral-400">Remind customer in 3 months</div>
                </div>
                <button onClick={() => setAlertBrakes(!alertBrakes)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${alertBrakes ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${alertBrakes ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
        )
      }
    }

    // Diagnosis
    if (type === 'diagnosis') {
      if (key === 'complaint') return (
        <div className="space-y-3">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-1 block">Diagnosis fee ($)</label>
            <input type="number" value={diagFee} onChange={e => setDiagFee(e.target.value)}
              className="w-32 text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none focus:border-neutral-400" />
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Customer complaint</label>
            <textarea value={complaint} onChange={e => setComplaint(e.target.value)}
              placeholder="Describe what the customer reported..." rows={4}
              className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
            <PhotoPicker photos={ph('complaint')} onChange={ps => setPh('complaint', ps)} />
          </div>
        </div>
      )
      if (key === 'findings') return (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <label className="text-xs text-neutral-500 mb-2 block">Mechanic's findings</label>
          <textarea value={findings} onChange={e => setFindings(e.target.value)}
            placeholder="Describe what you found..." rows={5}
            className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
          <PhotoPicker photos={ph('findings')} onChange={ps => setPh('findings', ps)} />
        </div>
      )
      if (key === 'outcome') {
        const URGENCY_OPTS = [
          { key: 'immediate',  label: 'Immediate',  color: 'border-red-300 bg-red-50 text-red-700' },
          { key: 'next_month', label: 'Next month', color: 'border-amber-300 bg-amber-50 text-amber-700' },
          { key: 'can_wait',   label: 'Can wait',   color: 'border-green-300 bg-green-50 text-green-700' },
        ]
        function updateEst(idx: number, field: string, val: string) {
          setEstimates((prev: Estimate[]) => prev.map((e: Estimate, i: number) => i === idx ? { ...e, [field]: val } : e))
        }
        function addRow() {
          setEstimates((prev: Estimate[]) => [...prev, { task: '', urgency: '', estCost: '', estTime: '' }])
        }
        function removeRow(idx: number) {
          setEstimates((prev: Estimate[]) => prev.filter((_: Estimate, i: number) => i !== idx))
        }
        return (
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <label className="text-xs text-neutral-500 mb-2 block">Repair recommendation</label>
              <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)}
                placeholder="What needs to be done..." rows={3}
                className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-neutral-500">Estimated tasks</label>
                <button onClick={addRow} className="text-xs px-2.5 py-1 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">+ Add row</button>
              </div>
              <div className="space-y-3">
                {estimates.map((est, idx) => (
                  <div key={idx} className="border border-neutral-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={est.task} onChange={e => updateEst(idx, 'task', e.target.value)}
                        placeholder="Task description"
                        className="flex-1 text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none bg-neutral-50" />
                      {estimates.length > 1 && (
                        <button onClick={() => removeRow(idx)} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {URGENCY_OPTS.map(u => (
                        <button key={u.key} onClick={() => updateEst(idx, 'urgency', est.urgency === u.key ? '' : u.key)}
                          className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${est.urgency === u.key ? u.color : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}>
                          {u.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Est. cost ($)</label>
                        <input type="number" value={est.estCost} onChange={e => updateEst(idx, 'estCost', e.target.value)}
                          placeholder="0.00" className="w-full text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Est. time</label>
                        <input type="text" value={est.estTime} onChange={e => updateEst(idx, 'estTime', e.target.value)}
                          placeholder="e.g. 2 hrs" className="w-full text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              A Repair job can be created from this diagnosis after completing the report.
            </div>
          </div>
        )
      }
    }

    // Repair
    if (type === 'repair') {
      if (key === 'problem') return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[{ key: 'customer', label: 'Customer report' }, { key: 'diagnosis', label: 'From diagnosis' }].map(s => (
              <button key={s.key} onClick={() => setRepairSource(s.key)}
                className={`py-2.5 text-sm rounded-xl border font-medium transition-colors ${repairSource === s.key ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Problem description</label>
            <textarea value={problem} onChange={e => setProblem(e.target.value)} placeholder="Describe the problem..." rows={4}
              className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
            <PhotoPicker photos={ph('problem')} onChange={ps => setPh('problem', ps)} />
          </div>
        </div>
      )
      if (key === 'diag_notes') return (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <label className="text-xs text-neutral-500 mb-2 block">Mechanic's diagnosis</label>
          <textarea value={diagNotes} onChange={e => setDiagNotes(e.target.value)} placeholder="What did you find?" rows={5}
            className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
          <PhotoPicker photos={ph('diag_notes')} onChange={ps => setPh('diag_notes', ps)} />
        </div>
      )
      if (key === 'parts') return (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 font-medium">
              <div className="col-span-6">Part name</div><div className="col-span-2 text-center">Qty</div><div className="col-span-3 text-right">Price ($)</div><div className="col-span-1" />
            </div>
            <div className="divide-y divide-neutral-100">
              {parts.map((p: Part, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 items-center">
                  <input value={p.name} onChange={e => setParts((prev: Part[]) => prev.map((x: Part, idx: number) => idx === i ? { ...x, name: e.target.value } : x))} placeholder="Part name"
                    className="col-span-6 text-base border border-neutral-200 rounded-lg px-2 py-2 focus:outline-none" />
                  <select value={p.qty} onChange={e => setParts((prev: Part[]) => prev.map((x: Part, idx: number) => idx === i ? { ...x, qty: Number(e.target.value) } : x))}
                    className="col-span-2 text-base border border-neutral-200 rounded-lg px-1 py-2 text-center focus:outline-none">
                    {[1,2,3,4,5,6,8,10].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <input type="number" value={p.price} onChange={e => setParts((prev: Part[]) => prev.map((x: Part, idx: number) => idx === i ? { ...x, price: e.target.value } : x))} placeholder="0.00"
                    className="col-span-3 text-base border border-neutral-200 rounded-lg px-2 py-2 text-right focus:outline-none" />
                  <button onClick={() => setParts((prev: Part[]) => prev.filter((_: Part, idx: number) => idx !== i))} className="col-span-1 text-neutral-300 hover:text-red-400 text-center text-lg leading-none">×</button>
                </div>
              ))}
            </div>
            <div className="px-4 py-2">
              <button onClick={() => setParts((prev: Part[]) => [...prev, { name: '', qty: 1, price: '' }])} className="text-xs text-blue-600 hover:text-blue-800">+ Add part</button>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-1 block">Labour cost ($)</label>
            <input type="number" value={labour} onChange={e => setLabour(e.target.value)} placeholder="0.00"
              className="w-full text-base border border-neutral-200 rounded-lg px-3 py-3 focus:outline-none" />
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <div className="flex justify-between text-sm text-neutral-500 mb-1"><span>Parts subtotal</span><span>${partsTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-neutral-500 mb-2"><span>Labour</span><span>${Number(labour || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-semibold text-neutral-900 pt-2 border-t border-neutral-200"><span>Total</span><span>${grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
      )
      if (key === 'result') return (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Repair outcome</label>
            <div className="space-y-2">
              {[{ key: 'fully_resolved', label: 'Fully resolved — issue fixed', color: 'border-green-300 bg-green-50 text-green-700' }, { key: 'partially_resolved', label: 'Partially resolved — further work needed', color: 'border-amber-300 bg-amber-50 text-amber-700' }, { key: 'not_resolved', label: 'Not resolved — refer to specialist', color: 'border-red-300 bg-red-50 text-red-700' }].map(r => (
                <button key={r.key} onClick={() => setRepairResult(repairResult === r.key ? '' : r.key)}
                  className={`w-full py-3 px-4 text-sm rounded-xl border text-left transition-colors ${repairResult === r.key ? r.color : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Final notes</label>
            <textarea value={finalNotes} onChange={e => setFinalNotes(e.target.value)} placeholder="Any final notes about the repair..." rows={3}
              className="w-full text-base px-3 py-3 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
            <PhotoPicker photos={ph('result')} onChange={ps => setPh('result', ps)} />
          </div>
        </div>
      )
    }

    return null
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row h-full">
      {mobileTopBar}
      {sidebar}
      <div ref={contentRef} className="flex-1 overflow-auto p-4 md:p-6 pb-6">
        <div className="max-w-2xl">
          {sectionHeader}
          {renderContent()}
          {navButtons}
        </div>
      </div>
    </div>
  )
}
