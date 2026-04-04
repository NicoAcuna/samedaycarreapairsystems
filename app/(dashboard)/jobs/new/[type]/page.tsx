'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'

const FLOW_CONFIG = {
  pre_purchase: {
    title: 'Pre-Purchase Inspection',
    sections: [
      {
        key: 'body', label: 'Body / Exterior',
        items: [
          { name: 'Paint condition',     options: ['Good', 'Fair', 'Poor'] },
          { name: 'Body panels / dents', options: ['Good', 'Fair', 'Poor'] },
          { name: 'Windscreen / glass',  options: ['Good', 'Fair', 'Poor'] },
        ]
      },
      {
        key: 'engine', label: 'Engine / Under Hood',
        items: [
          { name: 'Oil leaks',                     options: ['Good', 'Fair', 'Poor'] },
          { name: 'Fluids (coolant, oil, brakes)', options: ['Good', 'Fair', 'Poor'] },
          { name: 'Auxiliary / serpentine belt',   options: ['Good', 'Fair', 'Poor'] },
          { name: 'Engine & transmission noises',  options: ['Good', 'Fair', 'Poor'] },
          { name: 'Coolant hoses',                 options: ['Good', 'Fair', 'Poor'] },
        ]
      },
      {
        key: 'brakes', label: 'Brakes',
        items: [
          { name: 'Front brake pads / rotors', options: ['Good', 'Fair', 'Poor'] },
          { name: 'Rear brake pads / rotors',  options: ['Good', 'Fair', 'Poor'] },
        ]
      },
      {
        key: 'suspension', label: 'Suspension / Steering',
        items: [
          { name: 'Front suspension', options: ['Good', 'Fair', 'Poor'] },
          { name: 'Rear suspension',  options: ['Good', 'Fair', 'Poor'] },
          { name: 'Steering',         options: ['Good', 'Fair', 'Poor'] },
        ]
      },
      {
        key: 'tyres', label: 'Tyres',
        items: [
          { name: 'Front tyres', options: ['Good', 'Fair', 'Poor'] },
          { name: 'Rear tyres',  options: ['Good', 'Fair', 'Poor'] },
        ]
      },
      {
        key: 'obd', label: 'OBD Diagnostic',
        items: [
          { name: 'Fault codes', options: ['None', 'Codes found'] },
          { name: 'CO2 test',    options: ['Passed', 'Failed'] },
        ]
      },
      {
        key: 'test_drive', label: 'Test Drive',
        items: [
          { name: 'Overall behaviour',   options: ['Good', 'Fair', 'Poor'] },
          { name: 'Noises / vibrations', options: ['None', 'Minor', 'Notable'] },
        ]
      },
    ]
  },
  service: {
    title: 'Service',
    sections: [
      {
        key: 'service_type', label: 'Service Type',
        items: [
          { name: 'Service type', options: ['Minor Service', 'Major Service', 'Brake fluid flush', 'Coolant flush', 'Spark plugs', 'Custom'] },
        ]
      },
      {
        key: 'tasks', label: 'Tasks Done',
        items: [
          { name: 'Oil change',     options: ['Done', 'N/A'] },
          { name: 'Oil filter',     options: ['Done', 'N/A'] },
          { name: 'Washer fluid',   options: ['Done', 'N/A'] },
          { name: 'Tyre condition', options: ['Good', 'Fair', 'Poor'] },
          { name: 'Brake pads',     options: ['Good', 'Fair', 'Poor'] },
          { name: 'Battery',        options: ['Good', 'Fair', 'Poor'] },
        ]
      },
    ]
  },
  diagnosis: {
    title: 'Diagnosis',
    sections: [
      {
        key: 'complaint', label: 'Customer Complaint',
        items: [
          { name: 'Complaint description', options: [] },
        ]
      },
      {
        key: 'findings', label: 'Mechanic Findings',
        items: [
          { name: 'Findings', options: [] },
        ]
      },
      {
        key: 'outcome', label: 'Outcome',
        items: [
          { name: 'Urgency', options: ['Immediate', 'Next month', 'Can wait'] },
        ]
      },
    ]
  },
  repair: {
    title: 'Repair',
    sections: [
      {
        key: 'problem', label: 'Problem',
        items: [
          { name: 'Source',  options: ['Customer report', 'From diagnosis'] },
          { name: 'Problem description', options: [] },
        ]
      },
      {
        key: 'result', label: 'Result',
        items: [
          { name: 'Outcome', options: ['Fully resolved', 'Partially resolved', 'Not resolved'] },
        ]
      },
    ]
  },
}

const OPTION_STYLES: Record<string, string> = {
  Good:     'bg-green-50 text-green-700 border-green-300',
  Fair:     'bg-amber-50 text-amber-700 border-amber-300',
  Poor:     'bg-red-50 text-red-600 border-red-300',
  None:     'bg-green-50 text-green-700 border-green-300',
  Passed:   'bg-green-50 text-green-700 border-green-300',
  Failed:   'bg-red-50 text-red-600 border-red-300',
  'Codes found': 'bg-red-50 text-red-600 border-red-300',
  Minor:    'bg-amber-50 text-amber-700 border-amber-300',
  Notable:  'bg-red-50 text-red-600 border-red-300',
  Done:     'bg-green-50 text-green-700 border-green-300',
  'N/A':    'bg-neutral-100 text-neutral-500 border-neutral-300',
  Immediate:'bg-red-50 text-red-600 border-red-300',
  'Next month': 'bg-amber-50 text-amber-700 border-amber-300',
  'Can wait': 'bg-green-50 text-green-700 border-green-300',
  'Fully resolved': 'bg-green-50 text-green-700 border-green-300',
  'Partially resolved': 'bg-amber-50 text-amber-700 border-amber-300',
  'Not resolved': 'bg-red-50 text-red-600 border-red-300',
}

export default function JobTypeFlowPage({ params }: { params: Promise<{ type: string }> }) {
  const router = useRouter()
  const { type } = use(params)
  const config = FLOW_CONFIG[type as keyof typeof FLOW_CONFIG] || FLOW_CONFIG.pre_purchase
  const sections = config.sections

  const [activeIdx, setActiveIdx] = useState(0)
  const [selections, setSelections] = useState<Record<string, Record<string, string>>>({})
  const [comments, setComments] = useState<Record<string, Record<string, string>>>({})
  const [textInputs, setTextInputs] = useState<Record<string, Record<string, string>>>({})

  const activeSection = sections[activeIdx]

  function select(sectionKey: string, itemName: string, option: string) {
    const current = selections[sectionKey]?.[itemName]
    setSelections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [itemName]: current === option ? '' : option }
    }))
  }

  function setComment(sectionKey: string, itemName: string, val: string) {
    setComments(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [itemName]: val }
    }))
  }

  function setTextInput(sectionKey: string, itemName: string, val: string) {
    setTextInputs(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [itemName]: val }
    }))
  }

  function allSelected() {
    return activeSection.items.every(item => {
      if (item.options.length === 0) return (textInputs[activeSection.key]?.[item.name] || '').trim().length > 0
      return selections[activeSection.key]?.[item.name]
    })
  }

  function goNext() {
    if (activeIdx < sections.length - 1) {
      setActiveIdx(activeIdx + 1)
    } else {
      router.push(`/jobs/new/${type}/conclusion`)
    }
  }

  const progress = Math.round(((activeIdx) / sections.length) * 100)

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-100">
          <div className="text-xs font-medium text-neutral-900 mb-1">{config.title}</div>
          <div className="text-xs text-neutral-500 mb-2">Section {activeIdx + 1} of {sections.length}</div>
          <div className="h-1.5 bg-neutral-100 rounded-full">
            <div className="h-1.5 bg-neutral-900 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <nav className="flex-1 py-2">
          {sections.map((section, idx) => {
            const isDone = idx < activeIdx
            return (
              <button
                key={section.key}
                onClick={() => idx <= activeIdx && setActiveIdx(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left border-l-2 transition-colors ${
                  idx === activeIdx
                    ? 'border-neutral-900 bg-neutral-50 text-neutral-900 font-medium'
                    : isDone
                      ? 'border-transparent text-neutral-400 hover:bg-neutral-50 cursor-pointer'
                      : 'border-transparent text-neutral-300 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  isDone ? 'bg-green-100 text-green-700' :
                  idx === activeIdx ? 'bg-neutral-900 text-white' :
                  'bg-neutral-100 text-neutral-300'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </span>
                {section.label}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={() => router.push('/jobs')}
            className="w-full text-xs text-neutral-400 hover:text-neutral-600 text-center"
          >
            Save & exit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">{activeSection.label}</h2>
            <p className="text-sm text-neutral-500 mt-1">Section {activeIdx + 1} of {sections.length}</p>
          </div>

          <div className="space-y-4">
            {activeSection.items.map((item) => {
              const selected = selections[activeSection.key]?.[item.name]
              const comment = comments[activeSection.key]?.[item.name] || ''
              const textVal = textInputs[activeSection.key]?.[item.name] || ''

              return (
                <div key={item.name} className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className={`flex ${item.options.length > 0 ? 'items-center justify-between' : 'flex-col'} mb-3`}>
                    <span className="text-sm font-medium text-neutral-900 mb-2">{item.name}</span>
                    {item.options.length > 0 && (
                      <div className="flex gap-2 flex-wrap justify-end">
                        {item.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => select(activeSection.key, item.name, opt)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                              selected === opt
                                ? OPTION_STYLES[opt] || 'bg-neutral-900 text-white border-neutral-900'
                                : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {item.options.length === 0 ? (
                    <textarea
                      value={textVal}
                      onChange={(e) => setTextInput(activeSection.key, item.name, e.target.value)}
                      placeholder="Type here..."
                      rows={3}
                      className="w-full text-sm px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(activeSection.key, item.name, e.target.value)}
                      placeholder="Optional comment..."
                      className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
                    />
                  )}

                  {item.options.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-500 hover:text-neutral-500 cursor-pointer">
                        📷 Camera
                        <input type="file" accept="image/*" capture="environment" className="hidden" />
                      </label>
                      <label className="text-xs px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-neutral-500 hover:text-neutral-500 cursor-pointer">
                        🖼️ Gallery
                        <input type="file" accept="image/*" multiple className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => activeIdx > 0 && setActiveIdx(activeIdx - 1)}
              disabled={activeIdx === 0}
              className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={goNext}
              disabled={!allSelected()}
              className="text-sm px-5 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {activeIdx === sections.length - 1 ? 'Go to conclusion →' : 'Next section →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
