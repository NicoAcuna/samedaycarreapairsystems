'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'

type Kind = 'trigger' | 'exclude' | 'high_priority' | 'medium_priority'
type Channel = 'whatsapp' | 'facebook' | 'airtasker'

type Criterion = {
  id: string
  term: string
  kind: Kind
  channels: Channel[]
  active: boolean
}

const KINDS: { value: Kind; label: string; hint: string; tone: string }[] = [
  { value: 'trigger',         label: 'Disparador',      hint: 'Si aparece, se crea el lead', tone: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'exclude',         label: 'Excluir',         hint: 'Si aparece, se ignora',        tone: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'high_priority',   label: 'Prioridad alta',  hint: 'Marca el lead como 🔴',        tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'medium_priority', label: 'Prioridad media', hint: 'Marca el lead como 🟡',        tone: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
]

const CHANNELS: { value: Channel; label: string; icon: string }[] = [
  { value: 'whatsapp',  label: 'WhatsApp',  icon: '💬' },
  { value: 'facebook',  label: 'Facebook',  icon: '👥' },
  { value: 'airtasker', label: 'Airtasker', icon: '🔨' },
]

// Seeded when the user taps "Cargar palabras por defecto" — mirrors what the bot used before.
const DEFAULTS: { term: string; kind: Kind }[] = [
  ...['mecánico', 'mechanic', 'car repair', 'auto repair', 'car service', 'pink slip',
      'inspection', 'inspección', 'pre-purchase inspection', 'taller mecánico',
      'arreglar auto', 'reparar auto', 'falla auto', 'frenos', 'diagnóstico',
      'neumáticos pinchados'].map(term => ({ term, kind: 'trigger' as Kind })),
  ...['caja mecánica', 'transmisión mecánica', 'marcha mecánica', 'reloj mecánico',
      'open inspection', 'property inspection', 'for rent', 'for lease'].map(term => ({ term, kind: 'exclude' as Kind })),
  ...['reparación urgente', 'servicio express', 'frenos fallando'].map(term => ({ term, kind: 'high_priority' as Kind })),
  ...['diagnóstico de motor', 'neumático pinchado'].map(term => ({ term, kind: 'medium_priority' as Kind })),
]

function kindMeta(k: Kind) {
  return KINDS.find(x => x.value === k)!
}

export default function SettingsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [items, setItems] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)

  const [term, setTerm] = useState('')
  const [kind, setKind] = useState<Kind>('trigger')
  const [channels, setChannels] = useState<Channel[]>(['whatsapp', 'facebook', 'airtasker'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: userData } = await supabase
        .from('users').select('active_company_id, company_id').eq('id', user.id).single()
      const cid = userData?.active_company_id || userData?.company_id || null
      setCompanyId(cid)
      if (cid) await load(cid)
      setLoading(false)
    })
  }, [])

  async function load(cid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('lead_criteria')
      .select('id, term, kind, channels, active')
      .eq('company_id', cid)
      .order('created_at', { ascending: true })
    setItems((data as Criterion[]) || [])
  }

  function toggleChannel(c: Channel) {
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function addTerm() {
    const value = term.trim()
    if (!value) { setError('Escribí una palabra o frase'); return }
    if (channels.length === 0) { setError('Elegí al menos un canal'); return }
    if (!companyId) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('lead_criteria')
      .insert([{ company_id: companyId, term: value, kind, channels, active: true }])
      .select('id, term, kind, channels, active')
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setItems(prev => [...prev, data as Criterion])
    setTerm('')
  }

  async function toggleActive(it: Criterion) {
    const supabase = createClient()
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, active: !x.active } : x))
    await supabase.from('lead_criteria').update({ active: !it.active }).eq('id', it.id)
  }

  async function remove(it: Criterion) {
    const supabase = createClient()
    setItems(prev => prev.filter(x => x.id !== it.id))
    await supabase.from('lead_criteria').delete().eq('id', it.id)
  }

  async function loadDefaults() {
    if (!companyId) return
    setSaving(true); setError('')
    const supabase = createClient()
    const existing = new Set(items.map(i => `${i.kind}:${i.term.toLowerCase()}`))
    const rows = DEFAULTS
      .filter(d => !existing.has(`${d.kind}:${d.term.toLowerCase()}`))
      .map(d => ({ company_id: companyId, term: d.term, kind: d.kind, channels: ['whatsapp', 'facebook', 'airtasker'], active: true }))
    if (rows.length === 0) { setSaving(false); return }
    const { error: err } = await supabase.from('lead_criteria').insert(rows)
    setSaving(false)
    if (err) { setError(err.message); return }
    await load(companyId)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Criterios de leads</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Definí qué mensajes se convierten en lead. Estas palabras se aplican a los canales que elijas (WhatsApp, Facebook, Airtasker).
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 mb-6">
        <div className="flex gap-2 mb-3">
          <input
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTerm() }}
            placeholder="Palabra o frase, ej. no arranca"
            className="flex-1 text-base border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-neutral-50"
          />
          <button
            onClick={addTerm}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
          >
            Agregar
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {KINDS.map(k => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              title={k.hint}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                kind === k.value ? k.tone : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleChannel(c.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                channels.includes(c.value)
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              <span>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-400 text-center py-8">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-neutral-200 rounded-2xl">
          <p className="text-sm text-neutral-500 mb-3">Todavía no hay criterios.</p>
          <button
            onClick={loadDefaults}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            Cargar palabras por defecto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(it => {
            const meta = kindMeta(it.kind)
            return (
              <div
                key={it.id}
                className={`flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3 ${it.active ? '' : 'opacity-50'}`}
              >
                <span className={`text-xs px-2 py-0.5 rounded-md border ${meta.tone} flex-shrink-0`}>{meta.label}</span>
                <span className="flex-1 text-sm text-neutral-900 truncate">{it.term}</span>
                <div className="hidden sm:flex gap-1 flex-shrink-0">
                  {it.channels.map(ch => {
                    const c = CHANNELS.find(x => x.value === ch)
                    return c ? <span key={ch} title={c.label}>{c.icon}</span> : null
                  })}
                </div>
                <button
                  onClick={() => toggleActive(it)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 flex-shrink-0"
                  title={it.active ? 'Desactivar' : 'Activar'}
                >
                  {it.active ? 'On' : 'Off'}
                </button>
                <button
                  onClick={() => remove(it)}
                  className="text-neutral-300 hover:text-red-500 flex-shrink-0"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
