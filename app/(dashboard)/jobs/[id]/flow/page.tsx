'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'

// Job data by ID — después vendrá de Supabase
const JOBS: Record<string, { id: string; name: string; type: string; client: string; vehicle: string; plate: string }> = {
  '1': { id: '1', name: 'Pre-Purchase Inspection', type: 'pre_purchase', client: 'Jesus Nunez', vehicle: 'Toyota RAV4 2015', plate: 'ABC-123' },
  '2': { id: '2', name: 'Minor Service', type: 'service', client: 'Octa Juarez', vehicle: 'Honda CRV 2008', plate: 'BFW34T' },
  '3': { id: '3', name: 'Diagnosis', type: 'diagnosis', client: 'Luis Pérez', vehicle: 'Ford Ranger 2020', plate: 'QWE-789' },
  '4': { id: '4', name: 'Brake & Rotor Repair', type: 'repair', client: 'Carlos Méndez', vehicle: 'Toyota Camry 2019', plate: 'XYZ-321' },
}

// ── PRE-PURCHASE ──────────────────────────────────────────────────────────────
function PrePurchaseFlow({ job, onComplete }: { job: typeof JOBS[string]; onComplete: () => void }) {
  const SECTIONS = [
    { key: 'body',       label: 'Body / Exterior',       done: true,  items: [{ name: 'Paint condition', options: ['Good','Fair','Poor'] }, { name: 'Body panels / dents', options: ['Good','Fair','Poor'] }, { name: 'Windscreen / glass', options: ['Good','Fair','Poor'] }] },
    { key: 'engine',     label: 'Engine / Under Hood',   done: true,  items: [{ name: 'Oil leaks', options: ['Good','Fair','Poor'] }, { name: 'Fluids (coolant, oil, brakes)', options: ['Good','Fair','Poor'] }, { name: 'Auxiliary / serpentine belt', options: ['Good','Fair','Poor'] }, { name: 'Engine & transmission noises', options: ['Good','Fair','Poor'] }, { name: 'Coolant hoses', options: ['Good','Fair','Poor'] }] },
    { key: 'brakes',     label: 'Brakes',                done: true,  items: [{ name: 'Front brake pads / rotors', options: ['Good','Fair','Poor'] }, { name: 'Rear brake pads / rotors', options: ['Good','Fair','Poor'] }] },
    { key: 'suspension', label: 'Suspension / Steering', done: true,  items: [{ name: 'Front suspension', options: ['Good','Fair','Poor'] }, { name: 'Rear suspension', options: ['Good','Fair','Poor'] }, { name: 'Steering', options: ['Good','Fair','Poor'] }] },
    { key: 'tyres',      label: 'Tyres',                 done: false, items: [{ name: 'Front tyres', options: ['Good','Fair','Poor'] }, { name: 'Rear tyres', options: ['Good','Fair','Poor'] }] },
    { key: 'obd',        label: 'OBD Diagnostic',        done: false, items: [{ name: 'Fault codes', options: ['None','Codes found'] }, { name: 'CO2 test', options: ['Passed','Failed'] }] },
    { key: 'test_drive', label: 'Test Drive',            done: false, items: [{ name: 'Overall behaviour', options: ['Good','Fair','Poor'] }, { name: 'Noises / vibrations', options: ['None','Minor','Notable'] }] },
  ]
  const initialDone = new Set(SECTIONS.filter(s => s.done).map(s => s.key))
  const [doneSections, setDoneSections] = useState<Set<string>>(initialDone)
  const [activeIdx, setActiveIdx] = useState(SECTIONS.findIndex(s => !s.done))
  const [selections, setSelections] = useState<Record<string, Record<string, string>>>({})
  const [comments, setComments] = useState<Record<string, Record<string, string>>>({})

  const activeSection = SECTIONS[activeIdx]
  const completedCount = doneSections.size

  function select(itemName: string, option: string) {
    setSelections(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], [itemName]: option } }))
  }

  function handleNext() {
    setDoneSections(prev => new Set([...prev, activeSection.key]))
    if (activeIdx < SECTIONS.length - 1) {
      setActiveIdx(activeIdx + 1)
    } else {
      onComplete()
    }
  }

  return (
    <FlowShell
      sections={SECTIONS.map(s => ({ key: s.key, label: s.label, done: doneSections.has(s.key) }))}
      activeIdx={activeIdx}
      setActiveIdx={setActiveIdx}
      completedCount={completedCount}
      total={SECTIONS.length}
      job={job}
      canNext={true}
      isLast={activeIdx === SECTIONS.length - 1}
      onNext={handleNext}
      onPrev={() => activeIdx > 0 && setActiveIdx(activeIdx - 1)}
    >
      {doneSections.has(activeSection.key) && <DoneBanner />}
      <div className="space-y-4">
        {activeSection.items.map((item) => (
          <ChecklistItem
            key={item.name}
            name={item.name}
            options={item.options}
            selected={selections[activeSection.key]?.[item.name]}
            comment={comments[activeSection.key]?.[item.name] || ''}
            onSelect={(opt) => select(item.name, opt)}
            onComment={(val) => setComments(prev => ({ ...prev, [activeSection.key]: { ...prev[activeSection.key], [item.name]: val } }))}
          />
        ))}
      </div>
    </FlowShell>
  )
}

// ── SERVICE ───────────────────────────────────────────────────────────────────
function ServiceFlow({ job, onComplete }: { job: typeof JOBS[string]; onComplete: () => void }) {
  const STEPS = ['Service type', 'Tasks done', 'Observations', 'Next service']
  const SERVICE_TYPES = [
    { key: 'minor',       label: 'Minor Service',      desc: 'Oil + oil filter' },
    { key: 'major',       label: 'Major Service',      desc: 'Oil + filters + extras' },
    { key: 'brake_fluid', label: 'Brake fluid flush',  desc: 'Full system flush' },
    { key: 'coolant',     label: 'Coolant flush',      desc: 'Coolant replacement' },
    { key: 'spark_plugs', label: 'Spark plugs',        desc: 'Plugs replacement' },
    { key: 'custom',      label: 'Custom / other',     desc: 'Define manually' },
  ]
  const [step, setStep] = useState(0)
  const [serviceType, setServiceType] = useState('')
  const [tasks, setTasks] = useState({ oil: true, filter: true, washer: true })
  const [observations, setObservations] = useState('')
  const [nextMonths, setNextMonths] = useState(9)
  const [alertService, setAlertService] = useState(true)
  const [alertBrakes, setAlertBrakes] = useState(false)

  return (
    <FlowShell
      sections={STEPS.map((l, i) => ({ key: String(i), label: l, done: i < step }))}
      activeIdx={step}
      setActiveIdx={setStep}
      completedCount={step}
      total={STEPS.length}
      job={job}
      canNext={step === 0 ? !!serviceType : true}
      isLast={step === STEPS.length - 1}
      onNext={() => step < STEPS.length - 1 ? setStep(step + 1) : onComplete()}
      onPrev={() => step > 0 && setStep(step - 1)}
    >
      {step === 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Select service type</h3>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_TYPES.map(t => (
              <button key={t.key} onClick={() => setServiceType(t.key)}
                className={`p-4 rounded-xl border text-left transition-colors ${serviceType === t.key ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                <div className="text-sm font-medium text-neutral-900">{t.label}</div>
                <div className="text-xs text-neutral-500 mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Tasks completed</h3>
          {[{ key: 'oil', label: 'Oil change', detail: '5W-30 · 4.5L' }, { key: 'filter', label: 'Oil filter', detail: 'Replaced' }, { key: 'washer', label: 'Washer fluid', detail: 'Topped up' }].map(t => (
            <div key={t.key} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setTasks(prev => ({ ...prev, [t.key]: !prev[t.key as keyof typeof prev] }))}
                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${tasks[t.key as keyof typeof tasks] ? 'bg-neutral-900 border-neutral-900 text-white' : 'border-neutral-300'}`}>
                  {tasks[t.key as keyof typeof tasks] && <span className="text-xs">✓</span>}
                </button>
                <span className="text-sm font-medium text-neutral-900">{t.label}</span>
              </div>
              <span className="text-xs text-neutral-400">{t.detail}</span>
            </div>
          ))}
        </div>
      )}
      {step === 2 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Observations & recommendations</h3>
          <div className="space-y-3">
            {[{ label: 'Tyre condition', status: 'Good' }, { label: 'Brake pads (visual)', status: 'Fair' }, { label: 'Battery (visual)', status: 'Good' }, { label: 'Fluid levels', status: 'Good' }].map(item => (
              <div key={item.label} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3">
                <span className="text-sm text-neutral-900">{item.label}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.status === 'Good' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span>
              </div>
            ))}
            <textarea value={observations} onChange={e => setObservations(e.target.value)}
              placeholder="Additional recommendations..." rows={3}
              className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-400 resize-none" />
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-700 mb-3">Next service & alerts</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
            <div className="text-sm font-medium text-blue-800">Next Minor Service</div>
            <div className="text-xs text-blue-600 mt-0.5">Due in {nextMonths} months · est. {268172 + nextMonths * 1000} km</div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 mb-3 flex items-center gap-3">
            <label className="text-sm text-neutral-700 flex-1">Next service (months)</label>
            <input type="number" value={nextMonths} onChange={e => setNextMonths(Number(e.target.value))}
              className="w-16 text-sm text-center border border-neutral-300 rounded-lg px-2 py-1 focus:outline-none" />
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl px-4 divide-y divide-neutral-100">
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm text-neutral-900">Remind before next service</div>
                <div className="text-xs text-neutral-400">2 weeks before due date</div>
              </div>
              <button onClick={() => setAlertService(!alertService)}
                className={`w-10 h-6 rounded-full transition-colors relative ${alertService ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${alertService ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm text-neutral-900">Follow up — brake pads</div>
                <div className="text-xs text-neutral-400">Remind customer in 3 months</div>
              </div>
              <button onClick={() => setAlertBrakes(!alertBrakes)}
                className={`w-10 h-6 rounded-full transition-colors relative ${alertBrakes ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${alertBrakes ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </FlowShell>
  )
}

// ── DIAGNOSIS ─────────────────────────────────────────────────────────────────
function DiagnosisFlow({ job, onComplete }: { job: typeof JOBS[string]; onComplete: () => void }) {
  const STEPS = ['Customer complaint', 'Findings', 'Outcome']
  const [step, setStep] = useState(0)
  const [complaint, setComplaint] = useState('')
  const [findings, setFindings] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [estCost, setEstCost] = useState('')
  const [estTime, setEstTime] = useState('')
  const [urgency, setUrgency] = useState('')
  const [fee, setFee] = useState('80')

  return (
    <FlowShell
      sections={STEPS.map((l, i) => ({ key: String(i), label: l, done: i < step }))}
      activeIdx={step}
      setActiveIdx={setStep}
      completedCount={step}
      total={STEPS.length}
      job={job}
      canNext={step === 0 ? complaint.length > 5 : step === 1 ? findings.length > 5 : !!urgency}
      isLast={step === STEPS.length - 1}
      onNext={() => step < STEPS.length - 1 ? setStep(step + 1) : onComplete()}
      onPrev={() => step > 0 && setStep(step - 1)}
    >
      {step === 0 && (
        <div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-3">
            <label className="text-xs text-neutral-500 mb-1 block">Diagnosis fee ($)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)}
              className="w-32 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-400" />
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Customer complaint</label>
            <textarea value={complaint} onChange={e => setComplaint(e.target.value)}
              placeholder="Describe what the customer reported..." rows={4}
              className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 resize-none" />
            <button className="text-xs mt-2 px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-400">+ Add photo</button>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <label className="text-xs text-neutral-500 mb-2 block">Mechanic's findings</label>
          <textarea value={findings} onChange={e => setFindings(e.target.value)}
            placeholder="Describe what you found..." rows={5}
            className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 resize-none" />
          <button className="text-xs mt-2 px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-400">+ Add photo</button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Repair recommendation</label>
            <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)}
              placeholder="What needs to be done..." rows={3}
              className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <label className="text-xs text-neutral-500 mb-1 block">Est. repair cost ($)</label>
              <input type="number" value={estCost} onChange={e => setEstCost(e.target.value)}
                placeholder="0.00" className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <label className="text-xs text-neutral-500 mb-1 block">Est. time</label>
              <input type="text" value={estTime} onChange={e => setEstTime(e.target.value)}
                placeholder="e.g. 2 hrs" className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Urgency</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'immediate', label: 'Immediate', color: 'border-red-300 bg-red-50 text-red-700' },
                { key: 'next_month', label: 'Next month', color: 'border-amber-300 bg-amber-50 text-amber-700' },
                { key: 'can_wait', label: 'Can wait', color: 'border-green-300 bg-green-50 text-green-700' }].map(u => (
                <button key={u.key} onClick={() => setUrgency(u.key)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${urgency === u.key ? u.color : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'}`}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            A Repair job can be created from this diagnosis after completing the report.
          </div>
        </div>
      )}
    </FlowShell>
  )
}

// ── REPAIR ────────────────────────────────────────────────────────────────────
function RepairFlow({ job, onComplete }: { job: typeof JOBS[string]; onComplete: () => void }) {
  const STEPS = ['Problem', 'Diagnosis', 'Parts & labour', 'Result']
  const [step, setStep] = useState(0)
  const [source, setSource] = useState('customer')
  const [problem, setProblem] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [parts, setParts] = useState([{ name: '', qty: 1, price: '' }])
  const [labour, setLabour] = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')

  const partsTotal = parts.reduce((sum, p) => sum + (Number(p.price) * p.qty || 0), 0)
  const grandTotal = partsTotal + (Number(labour) || 0)

  function addPart() { setParts(prev => [...prev, { name: '', qty: 1, price: '' }]) }
  function updatePart(i: number, field: string, val: string | number) {
    setParts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  return (
    <FlowShell
      sections={STEPS.map((l, i) => ({ key: String(i), label: l, done: i < step }))}
      activeIdx={step}
      setActiveIdx={setStep}
      completedCount={step}
      total={STEPS.length}
      job={job}
      canNext={step === 0 ? problem.length > 5 : step === 1 ? diagnosis.length > 5 : step === 2 ? !!labour : !!result}
      isLast={step === STEPS.length - 1}
      onNext={() => step < STEPS.length - 1 ? setStep(step + 1) : onComplete()}
      onPrev={() => step > 0 && setStep(step - 1)}
    >
      {step === 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[{ key: 'customer', label: 'Customer report' }, { key: 'diagnosis', label: 'From diagnosis' }].map(s => (
              <button key={s.key} onClick={() => setSource(s.key)}
                className={`py-2.5 text-sm rounded-xl border font-medium transition-colors ${source === s.key ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Problem description</label>
            <textarea value={problem} onChange={e => setProblem(e.target.value)}
              placeholder="Describe the problem..." rows={4}
              className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
            <button className="text-xs mt-2 px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-400">+ Add photo</button>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <label className="text-xs text-neutral-500 mb-2 block">Mechanic's diagnosis</label>
          <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
            placeholder="What did you find?" rows={5}
            className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
          <button className="text-xs mt-2 px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-400">+ Add photo</button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 font-medium">
              <div className="col-span-6">Part name</div><div className="col-span-2 text-center">Qty</div><div className="col-span-3 text-right">Price ($)</div><div className="col-span-1"></div>
            </div>
            <div className="divide-y divide-neutral-100">
              {parts.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 items-center">
                  <input value={p.name} onChange={e => updatePart(i, 'name', e.target.value)} placeholder="Part name"
                    className="col-span-6 text-sm border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                  <select value={p.qty} onChange={e => updatePart(i, 'qty', Number(e.target.value))}
                    className="col-span-2 text-sm border border-neutral-200 rounded-lg px-1 py-1.5 text-center focus:outline-none">
                    {[1,2,3,4].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <input type="number" value={p.price} onChange={e => updatePart(i, 'price', e.target.value)} placeholder="0.00"
                    className="col-span-3 text-sm border border-neutral-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" />
                  <button onClick={() => setParts(prev => prev.filter((_, idx) => idx !== i))} className="col-span-1 text-neutral-300 hover:text-red-400 text-center">×</button>
                </div>
              ))}
            </div>
            <div className="px-4 py-2">
              <button onClick={addPart} className="text-xs text-blue-600 hover:text-blue-800">+ Add part</button>
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-1 block">Labour cost ($)</label>
            <input type="number" value={labour} onChange={e => setLabour(e.target.value)} placeholder="0.00"
              className="w-36 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <div className="flex justify-between text-sm text-neutral-500 mb-1"><span>Parts subtotal</span><span>${partsTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-neutral-500 mb-2"><span>Labour</span><span>${Number(labour || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-semibold text-neutral-900 pt-2 border-t border-neutral-200"><span>Total</span><span>${grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Repair outcome</label>
            <div className="space-y-2">
              {[
                { key: 'fully_resolved',    label: 'Fully resolved — issue fixed',          color: 'border-green-300 bg-green-50 text-green-700' },
                { key: 'partially_resolved', label: 'Partially resolved — further work needed', color: 'border-amber-300 bg-amber-50 text-amber-700' },
                { key: 'not_resolved',       label: 'Not resolved — refer to specialist',    color: 'border-red-300 bg-red-50 text-red-700' },
              ].map(r => (
                <button key={r.key} onClick={() => setResult(r.key)}
                  className={`w-full py-3 px-4 text-sm rounded-xl border text-left transition-colors ${result === r.key ? r.color : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <label className="text-xs text-neutral-500 mb-2 block">Final notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any final notes about the repair..." rows={3}
              className="w-full text-sm px-3 py-2.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none resize-none" />
            <button className="text-xs mt-2 px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-400">+ Add photo</button>
          </div>
        </div>
      )}
    </FlowShell>
  )
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function DoneBanner() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4 text-xs text-green-700 font-medium">
      ✓ This section was already completed. You can review or edit below.
    </div>
  )
}

function ChecklistItem({ name, options, selected, comment, onSelect, onComment }: {
  name: string; options: string[]; selected?: string; comment: string;
  onSelect: (opt: string) => void; onComment: (val: string) => void;
}) {
  const OPTION_STYLES: Record<string, string> = {
    Good: 'bg-green-50 text-green-700 border-green-300',
    Fair: 'bg-amber-50 text-amber-700 border-amber-300',
    Poor: 'bg-red-50 text-red-600 border-red-300',
    None: 'bg-green-50 text-green-700 border-green-300',
    Passed: 'bg-green-50 text-green-700 border-green-300',
    Failed: 'bg-red-50 text-red-600 border-red-300',
    'Codes found': 'bg-red-50 text-red-600 border-red-300',
    Minor: 'bg-amber-50 text-amber-700 border-amber-300',
    Notable: 'bg-red-50 text-red-600 border-red-300',
  }
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-neutral-900">{name}</span>
        <div className="flex gap-2">
          {options.map(opt => (
            <button key={opt} onClick={() => onSelect(selected === opt ? '' : opt)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${selected === opt ? OPTION_STYLES[opt] || 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <input type="text" value={comment} onChange={e => onComment(e.target.value)}
        placeholder="Optional comment..."
        className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-neutral-400" />
      <button className="text-xs mt-2 px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-400 hover:text-neutral-500">
        + Add photo
      </button>
    </div>
  )
}

function FlowShell({ sections, activeIdx, setActiveIdx, completedCount, total, job, canNext, isLast, onNext, onPrev, children }: {
  sections: { key: string; label: string; done: boolean }[];
  activeIdx: number; setActiveIdx: (i: number) => void;
  completedCount: number; total: number;
  job: typeof JOBS[string];
  canNext: boolean; isLast: boolean;
  onNext: () => void; onPrev: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter()
  const progress = Math.round((completedCount / total) * 100)
  const activeSection = sections[activeIdx]

  return (
    <div className="flex h-full">
      <div className="w-52 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-100">
          <div className="text-xs text-neutral-500 mb-1">{job.name} · {completedCount} of {total}</div>
          <div className="h-1.5 bg-neutral-100 rounded-full">
            <div className="h-1.5 bg-neutral-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <nav className="flex-1 py-2">
          {sections.map((s, idx) => (
            <button key={s.key} onClick={() => setActiveIdx(idx)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left border-l-2 transition-colors ${idx === activeIdx ? 'border-neutral-900 bg-neutral-50 text-neutral-900 font-medium' : s.done ? 'border-transparent text-neutral-400 hover:bg-neutral-50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${s.done ? 'bg-green-100 text-green-700' : idx === activeIdx ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                {s.done ? '✓' : idx + 1}
              </span>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-100">
          <button onClick={() => router.push(`/jobs/${job.id}`)} className="w-full text-xs text-neutral-400 hover:text-neutral-600 text-center">
            Save & exit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-900">{activeSection.label}</h2>
            <p className="text-sm text-neutral-500 mt-1">{job.vehicle} · {job.plate}
              {activeSection.done && <span className="ml-2 text-green-600 text-xs font-medium">· Already completed</span>}
            </p>
          </div>
          {activeSection.done && <DoneBanner />}
          {children}
          <div className="flex items-center justify-between mt-6">
            <button onClick={onPrev} disabled={activeIdx === 0}
              className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed">
              ← Previous
            </button>
            <button onClick={onNext} disabled={!canNext}
              className="text-sm px-5 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {isLast ? 'Generate report →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function JobFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const job = JOBS[id] || JOBS['1']

  function handleComplete() {
    router.push(`/jobs/${id}/report`)
  }

  if (job.type === 'service')      return <ServiceFlow   job={job} onComplete={handleComplete} />
  if (job.type === 'diagnosis')    return <DiagnosisFlow job={job} onComplete={handleComplete} />
  if (job.type === 'repair')       return <RepairFlow    job={job} onComplete={handleComplete} />
  return <PrePurchaseFlow job={job} onComplete={handleComplete} />
}
