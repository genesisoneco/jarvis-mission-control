import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Bot, Clock3, RefreshCw, ShieldAlert, Zap } from 'lucide-react'

type Health = 'healthy' | 'warning' | 'critical'

type Stat = {
  label: string
  value: string
  health: Health
  note: string
}

type EventItem = {
  time: string
  severity: Health
  title: string
  detail: string
}

type AgentItem = {
  name: string
  state: string
  model: string
  focus: string
  initials: string
  avatarClass: string
  note: string
}

type AttentionItemType = {
  title: string
  detail: string
}

type AutomationItem = {
  name: string
  state: string
  detail: string
}

type RoutingLane = {
  description: string
  modelOrder: string[]
  escalateWhen?: string[]
}

type OverviewResponse = {
  fetchedAt: string
  stats: Stat[]
  events: EventItem[]
  agents: AgentItem[]
  attention: AttentionItemType[]
  automations: AutomationItem[]
  raw?: {
    routingPolicy?: {
      owner?: string
      lanes?: {
        defaultEngineering?: RoutingLane
        missionControlUpdate?: RoutingLane
      }
    }
  }
}

const healthClasses: Record<Health, string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
}

async function fetchOverview(): Promise<OverviewResponse> {
  const apiUrl = `${import.meta.env.BASE_URL}api/overview`

  try {
    const response = await fetch(apiUrl)
    if (response.ok) {
      return response.json()
    }
  } catch {
    // fall through to bundled snapshot for hosted preview mode
  }

  const fallbackResponse = await fetch(`${import.meta.env.BASE_URL}overview-snapshot.json`)
  if (!fallbackResponse.ok) {
    throw new Error(`Failed to load overview snapshot (${fallbackResponse.status})`)
  }
  return fallbackResponse.json()
}

function App() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    refetchInterval: 30000,
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Jarvis Mission Control</p>
            <h1 className="text-3xl font-semibold text-white">Operator dashboard for OpenClaw</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Live signal view of health, agents, automations, and intervention points. Built for fast decisions, not dashboard theater.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {data?.fetchedAt ? `Last refresh: ${new Date(data.fetchedAt).toLocaleString()}` : 'Waiting for first live snapshot...'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              <Zap className="h-4 w-4" /> Quick actions
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {(error as Error).message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(data?.stats ?? []).map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <span className={`rounded-full border px-2 py-1 text-xs ${healthClasses[stat.health]}`}>{stat.health}</span>
              </div>
              <div className="text-3xl font-semibold text-white">{stat.value}</div>
              <p className="mt-2 text-sm text-slate-400">{stat.note}</p>
            </div>
          ))}
          {isLoading && !data ? <LoadingCard /> : null}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-6">
            <Panel title="Active agents" icon={<Bot className="h-4 w-4" />}>
              <div className="space-y-3">
                {(data?.agents ?? []).map((agent) => (
                  <div key={agent.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-md bg-gradient-to-br ${agent.avatarClass} text-sm font-semibold tracking-wide text-white shadow-lg shadow-slate-950/40`}
                        >
                          {agent.initials}
                        </div>
                        <div>
                          <div className="font-medium text-white">{agent.name}</div>
                          <div className="text-sm text-slate-400">{agent.focus}</div>
                          <div className="mt-1 text-xs text-slate-500">{agent.note}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-cyan-300">{agent.state}</div>
                        <div className="text-xs text-slate-500">{agent.model}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recent events" icon={<Activity className="h-4 w-4" />}>
              <div className="space-y-3">
                {(data?.events ?? []).map((event) => (
                  <div key={`${event.time}-${event.title}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <div className="font-medium text-white">{event.title}</div>
                      <span className={`rounded-full border px-2 py-1 text-xs ${healthClasses[event.severity]}`}>{event.time}</span>
                    </div>
                    <p className="text-sm text-slate-400">{event.detail}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Attention queue" icon={<AlertTriangle className="h-4 w-4" />}>
              {(data?.attention ?? []).length ? (
                data?.attention.map((item) => <AttentionCard key={item.title} title={item.title} detail={item.detail} />)
              ) : (
                <MutedBlock text="Nothing urgent is currently screaming for attention." />
              )}
            </Panel>

            <Panel title="Quick actions" icon={<Zap className="h-4 w-4" />}>
              <ActionButton label="Restart gateway" />
              <ActionButton label="Retry failed cron" />
              <ActionButton label="Kill stuck session" />
              <ActionButton label="Open approval queue" />
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Security & controls" icon={<ShieldAlert className="h-4 w-4" />}>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">Tier 1 actions require explicit confirmation.</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">Preserve exact commands for approvals.</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">The dashboard reads local OpenClaw state through a thin adapter API.</li>
              </ul>
            </Panel>

            <Panel title="Automation status" icon={<Clock3 className="h-4 w-4" />}>
              <ul className="space-y-3 text-sm text-slate-300">
                {(data?.automations ?? []).map((item) => (
                  <li key={item.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.state}</div>
                    <div className="mt-2 text-slate-400">{item.detail}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      </div>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function AttentionCard({ title, detail }: AttentionItemType) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="font-medium text-amber-200">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </div>
  )
}

function ActionButton({ label }: { label: string }) {
  return <button className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800">{label}</button>
}

function MutedBlock({ text }: { text: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">{text}</div>
}

function RoutingPolicyCard({ data }: { data?: NonNullable<OverviewResponse['raw']>['routingPolicy'] }) {
  if (!data?.lanes) {
    return <MutedBlock text="No routing policy loaded." />
  }

  const updateLane = data.lanes.missionControlUpdate
  const defaultLane = data.lanes.defaultEngineering

  return (
    <div className="space-y-3 text-sm text-slate-300">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="font-medium text-cyan-200">Mission Control update lane</div>
        <div className="mt-1 text-slate-400">{updateLane?.description}</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-slate-500">{updateLane?.modelOrder?.join(' → ')}</div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="font-medium text-white">Default engineering lane</div>
        <div className="mt-1 text-slate-400">{defaultLane?.description}</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-slate-500">{defaultLane?.modelOrder?.join(' → ')}</div>
      </div>
    </div>
  )
}

function LoadingCard() {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Loading live OpenClaw snapshot…</div>
}

export default App
