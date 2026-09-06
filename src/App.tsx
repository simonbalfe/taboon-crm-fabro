import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import {
  pb,
  toCompany,
  toContact,
  toDeal,
  type Company,
  type Contact,
  type Deal,
} from './pocketbase'

type CrmData = Readonly<{
  companies: readonly Company[]
  contacts: readonly Contact[]
  deals: readonly Deal[]
}>

const emptyData: CrmData = { companies: [], contacts: [], deals: [] }
const stages = ['lead', 'qualified', 'proposal', 'won', 'lost'] as const

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong'

const requiredText = (form: FormData, name: string): string => {
  const value = form.get(name)
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`)
  }
  return value.trim()
}

const optionalText = (form: FormData, name: string): string => {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export function App(): React.ReactElement {
  const [authenticated, setAuthenticated] = useState(pb.authStore.isValid)

  useEffect(() => pb.authStore.onChange(() => setAuthenticated(pb.authStore.isValid)), [])

  if (!authenticated) {
    return <Login />
  }

  return <Crm />
}

function Login(): React.ReactElement {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await pb.collection('users').authWithPassword(
        requiredText(form, 'email'),
        requiredText(form, 'password'),
      )
    } catch (error: unknown) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Taboon</p>
        <h1>Your customers, clearly.</h1>
        <p className="muted">A small CRM built to test a Fabro software workflow.</p>
        <form onSubmit={submit} className="stack">
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p className="error">{error}</p>}
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}

function Crm(): React.ReactElement {
  const [data, setData] = useState<CrmData>(emptyData)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (): Promise<void> => {
    try {
      const [companies, contacts, deals] = await Promise.all([
        pb.collection('companies').getFullList({ sort: '-created' }),
        pb.collection('contacts').getFullList({ sort: '-created' }),
        pb.collection('deals').getFullList({ sort: '-created' }),
      ])
      setData({
        companies: companies.map(toCompany),
        contacts: contacts.map(toContact),
        deals: deals.map(toDeal),
      })
      setError('')
    } catch (error: unknown) {
      setError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (
    collection: 'companies' | 'contacts' | 'deals',
    values: Readonly<Record<string, string | number>>,
  ): Promise<void> => {
    const owner = pb.authStore.record?.id
    if (!owner) {
      throw new Error('Your session has expired')
    }
    await pb.collection(collection).create({ ...values, owner })
    await load()
  }

  return (
    <div className="app-shell">
      <aside>
        <div><p className="eyebrow">Taboon</p><h2>CRM</h2></div>
        <nav>
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/contacts">Contacts</NavLink>
          <NavLink to="/companies">Companies</NavLink>
          <NavLink to="/deals">Deals</NavLink>
          <NavLink to="/assistant">AI assistant</NavLink>
        </nav>
        <button className="quiet" onClick={() => pb.authStore.clear()}>Sign out</button>
      </aside>
      <main className="content">
        {error && <p className="error banner">{error}</p>}
        {loading ? <p className="muted">Loading…</p> : (
          <Routes>
            <Route path="/" element={<Overview data={data} />} />
            <Route path="/contacts" element={<Contacts data={data} create={create} />} />
            <Route path="/companies" element={<Companies data={data} create={create} />} />
            <Route path="/deals" element={<Deals data={data} create={create} />} />
            <Route path="/assistant" element={<Assistant onChange={load} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

function Overview({ data }: Readonly<{ data: CrmData }>): React.ReactElement {
  const pipeline = data.deals
    .filter((deal) => deal.stage !== 'lost')
    .reduce((total, deal) => total + deal.amount, 0)

  return (
    <section>
      <Header title="Good morning" subtitle="Here is what is moving today." />
      <div className="metrics">
        <Metric label="Contacts" value={String(data.contacts.length)} />
        <Metric label="Companies" value={String(data.companies.length)} />
        <Metric label="Open pipeline" value={money(pipeline)} />
      </div>
      <div className="panel">
        <h3>Recent deals</h3>
        <DealTable deals={data.deals.slice(0, 6)} companies={data.companies} />
      </div>
    </section>
  )
}

function Contacts({ data, create }: PageProps): React.ReactElement {
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await create('contacts', {
        name: requiredText(form, 'name'),
        email: optionalText(form, 'email'),
        phone: optionalText(form, 'phone'),
        company: optionalText(form, 'company'),
      })
      formElement.reset()
      setError('')
    } catch (error: unknown) {
      setError(errorMessage(error))
    }
  }

  return (
    <section>
      <Header title="Contacts" subtitle="People your team is speaking with." />
      <form className="inline-form" onSubmit={submit}>
        <input name="name" placeholder="Name" aria-label="Name" required />
        <input name="email" type="email" placeholder="Email" aria-label="Email" />
        <input name="phone" placeholder="Phone" aria-label="Phone" />
        <select name="company" aria-label="Company"><option value="">No company</option>{data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <button>Add contact</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel table-wrap"><table><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th></tr></thead><tbody>{data.contacts.map((contact) => <tr key={contact.id}><td>{contact.name}</td><td>{companyName(data.companies, contact.company)}</td><td>{contact.email || '—'}</td><td>{contact.phone || '—'}</td></tr>)}</tbody></table></div>
    </section>
  )
}

function Companies({ data, create }: PageProps): React.ReactElement {
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await create('companies', { name: requiredText(form, 'name'), website: optionalText(form, 'website') })
      formElement.reset()
      setError('')
    } catch (error: unknown) {
      setError(errorMessage(error))
    }
  }

  return (
    <section>
      <Header title="Companies" subtitle="Accounts in your pipeline." />
      <form className="inline-form compact" onSubmit={submit}>
        <input name="name" placeholder="Company name" aria-label="Company name" required />
        <input name="website" type="url" placeholder="https://example.com" aria-label="Website" />
        <button>Add company</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="cards">{data.companies.map((company) => <article className="company-card" key={company.id}><div className="company-mark">{company.name.slice(0, 1).toUpperCase()}</div><div><h3>{company.name}</h3><p className="muted">{company.website || 'No website'}</p></div></article>)}</div>
    </section>
  )
}

function Deals({ data, create }: PageProps): React.ReactElement {
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const amount = Number(requiredText(form, 'amount'))
    if (!Number.isFinite(amount) || amount < 0) {
      setError('amount must be a positive number')
      return
    }
    try {
      await create('deals', {
        title: requiredText(form, 'title'),
        amount,
        stage: requiredText(form, 'stage'),
        company: optionalText(form, 'company'),
        contact: optionalText(form, 'contact'),
      })
      formElement.reset()
      setError('')
    } catch (error: unknown) {
      setError(errorMessage(error))
    }
  }

  return (
    <section>
      <Header title="Deals" subtitle="Revenue moving through the pipeline." />
      <form className="inline-form" onSubmit={submit}>
        <input name="title" placeholder="Deal title" aria-label="Deal title" required />
        <input name="amount" type="number" min="0" step="0.01" placeholder="Value" aria-label="Value" required />
        <select name="stage" aria-label="Stage">{stages.map((stage) => <option key={stage}>{stage}</option>)}</select>
        <select name="company" aria-label="Company"><option value="">No company</option>{data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <select name="contact" aria-label="Contact"><option value="">No contact</option>{data.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select>
        <button>Add deal</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="panel"><DealTable deals={data.deals} companies={data.companies} /></div>
    </section>
  )
}

function Assistant({ onChange }: Readonly<{ onChange: () => Promise<void> }>): React.ReactElement {
  const [messages, setMessages] = useState<readonly string[]>(['Ask me to find records or add a contact or deal.'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const message = requiredText(form, 'message')
    setBusy(true)
    setError('')
    try {
      const response: unknown = await pb.send('/api/taboon-crm/assistant', { method: 'POST', body: { message } })
      if (!isAssistantResponse(response)) {
        throw new Error('The assistant returned an invalid response')
      }
      setMessages((current) => [...current, `You: ${message}`, `Assistant: ${response.reply}`])
      formElement.reset()
      await onChange()
    } catch (error: unknown) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <Header title="AI assistant" subtitle="OpenRouter with scoped CRM read and write tools." />
      <div className="assistant-panel">{messages.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}</div>
      <form className="assistant-form" onSubmit={submit}><input name="message" placeholder="Show my latest contacts…" aria-label="Message" required /><button disabled={busy}>{busy ? 'Working…' : 'Send'}</button></form>
      {error && <p className="error">{error}</p>}
    </section>
  )
}

type PageProps = Readonly<{
  data: CrmData
  create: (collection: 'companies' | 'contacts' | 'deals', values: Readonly<Record<string, string | number>>) => Promise<void>
}>

function Header({ title, subtitle }: Readonly<{ title: string; subtitle: string }>): React.ReactElement {
  return <header className="page-header"><div><p className="eyebrow">Workspace</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><span className="today">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date())}</span></header>
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>): React.ReactElement {
  return <article className="metric"><p>{label}</p><strong>{value}</strong></article>
}

function DealTable({ deals, companies }: Readonly<{ deals: readonly Deal[]; companies: readonly Company[] }>): React.ReactElement {
  if (!deals.length) {
    return <p className="muted empty">No deals yet.</p>
  }
  return <div className="table-wrap"><table><thead><tr><th>Deal</th><th>Company</th><th>Stage</th><th>Value</th></tr></thead><tbody>{deals.map((deal) => <tr key={deal.id}><td>{deal.title}</td><td>{companyName(companies, deal.company)}</td><td><span className={`stage ${deal.stage}`}>{deal.stage}</span></td><td>{money(deal.amount)}</td></tr>)}</tbody></table></div>
}

const companyName = (companies: readonly Company[], id: string): string =>
  companies.find((company) => company.id === id)?.name || '—'

const money = (amount: number): string =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount)

const isAssistantResponse = (value: unknown): value is Readonly<{ reply: string }> =>
  typeof value === 'object' && value !== null && 'reply' in value && typeof value.reply === 'string'
