'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'

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
}

const REC_STYLES: Record<string, string> = {
  IMMEDIATE: 'bg-red-50 text-red-700 border border-red-200',
  MONITOR:   'bg-amber-50 text-amber-700 border border-amber-200',
  ADVISORY:  'bg-blue-50 text-blue-700 border border-blue-200',
}

function getVerdict(sections: typeof REPORT.sections) {
  const allItems = sections.flatMap(s => s.items)
  const poor  = allItems.filter(i => i.result === 'Poor' || i.result === 'Failed' || i.result === 'Codes found').length
  const fair  = allItems.filter(i => i.result === 'Fair' || i.result === 'Minor').length
  const good  = allItems.filter(i => !['Poor','Fair','Minor','Failed','Codes found','Notable'].includes(i.result)).length
  const notable = allItems.filter(i => i.result === 'Notable').length

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

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const report = REPORT
  const verdict = getVerdict(report.sections)
  const counts = countResults(report.sections)

  return (
    <div className="p-6 max-w-3xl">

      {/* Top actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push(`/jobs/${id}`)} className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1">
          ← Back to job
        </button>
        <div className="flex gap-2">
          <button className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">
            Send to client
          </button>
          <button className="text-sm px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">
            Download PDF
          </button>
        </div>
      </div>

      {/* Report card */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">

        {/* Report header */}
        <div className="bg-neutral-900 px-6 py-5">
          <div className="text-xs font-semibold text-green-400 uppercase tracking-widest mb-1">{report.type}</div>
          <div className="text-xl font-bold text-white">Inspection Report</div>
          <div className="text-xs text-neutral-400 mt-1">Same Day Car Repair · Mobile Mechanic · 0439 269 598</div>
        </div>

        {/* Date / Odometer / Location bar */}
        <div className="flex items-center gap-8 px-6 py-3 border-b border-neutral-100 bg-neutral-50 text-sm">
          <div><span className="text-neutral-400 text-xs">Inspection Date</span><div className="font-semibold text-neutral-900">{report.date}</div></div>
          <div><span className="text-neutral-400 text-xs">Odometer</span><div className="font-semibold text-neutral-900">{report.odometer}</div></div>
          <div><span className="text-neutral-400 text-xs">Location</span><div className="font-semibold text-neutral-900">{report.location}</div></div>
        </div>

        {/* Client + Vehicle info */}
        <div className="grid grid-cols-2 border-b border-neutral-100">
          <div className="p-5 border-r border-neutral-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-white bg-green-700 px-3 py-1.5 rounded mb-3 inline-block">Client Information</div>
            {[
              { label: 'Client Name', value: report.client.name },
              { label: 'Phone',       value: report.client.phone },
              { label: 'Email',       value: report.client.email },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-4 py-1.5">
                <span className="text-xs text-neutral-400 w-24 flex-shrink-0">{row.label}</span>
                <span className="text-sm font-semibold text-neutral-900">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 px-3 py-1.5 rounded mb-3 inline-block">Vehicle Information</div>
            {[
              { label: 'Vehicle',     value: report.vehicle.make },
              { label: 'Plate / Rego',value: report.vehicle.plate },
              { label: 'Odometer',    value: report.vehicle.odometer },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-4 py-1.5">
                <span className="text-xs text-neutral-400 w-24 flex-shrink-0">{row.label}</span>
                <span className="text-sm font-semibold text-neutral-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Verdict */}
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

        {/* Sections */}
        {report.sections.map((section) => (
          <div key={section.label} className="border-t border-neutral-100">
            <div className="bg-neutral-900 px-5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">{section.label}</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {section.items.map((item) => (
                <div key={item.name} className="flex items-start justify-between px-5 py-3">
                  <div className="flex-1 pr-4">
                    <div className="text-sm font-semibold text-neutral-900">{item.name}</div>
                    {item.comment
                      ? <div className="text-xs italic text-neutral-500 mt-0.5">{item.comment}</div>
                      : <div className="text-xs text-neutral-300 mt-0.5">—</div>
                    }
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded flex-shrink-0 ${RESULT_STYLES[item.result]?.badge || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
                    {item.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Additional Notes */}
        {report.additionalNotes && (
          <div className="border-t border-neutral-100">
            <div className="bg-neutral-900 px-5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Additional Notes</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-neutral-700 leading-relaxed">{report.additionalNotes}</p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="border-t border-neutral-100">
            <div className="bg-neutral-900 px-5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">Recommendations</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${REC_STYLES[rec.type] || 'bg-neutral-100 text-neutral-600'}`}>
                    {rec.type}
                  </span>
                  <span className="text-sm text-neutral-700">{rec.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="border-t border-neutral-100 px-5 py-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            DISCLAIMER: This report is based on a visual and functional inspection performed at the time of service. It is provided for informational purposes only and does not constitute a guarantee of the vehicle's condition, past history, or future performance. Same Day Car Repair accepts no liability for any issues that may arise after the inspection. Findings are accurate to the best of the inspector's knowledge at the time of inspection.
          </p>
        </div>

      </div>
    </div>
  )
}
