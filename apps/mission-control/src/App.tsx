import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Bot, Clock3, RefreshCw, ShieldAlert, Zap, LogOut, Lock, Cpu, BarChart3, TrendingUp, Timer, Coins, Layers } from 'lucide-react'

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

type LLMOverview = {
  activeModels: string[]
  totalTokens24h: number
  providerBreakdown: Record<string, number>
  hottestSession: {
    id: string
    agentId: string
    tokens: number
    model: string
  } | null
  reliability?: {
    successRate: number
    recentFailures: number
    avgLatencyMs: number
  }
  cacheUsage?: {
    enabled: boolean
    hitRate: number
    savedTokens24h: number
  }
  sessionStats?: {
    active: number
    warm: number
  }
  estimatedCost24h?: number
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
  llmOverview?: LLMOverview
  auth?: {
    required: boolean
    via: string
    publicOrigin: string | null
  }
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
    const response = await fetch(apiUrl, { credentials: 'include' })
    if (response.status === 401) {
      throw new Error('Authentication required. Open the Mission Control host in a browser and log in first.')
    }
    if (response.ok) {
      return response.json()
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication required')) {
      throw error
    }
  }

  const fallbackResponse = await fetch(`${import.meta.env.BASE_URL}overview-snapshot.json`)
  if (!fallbackResponse.ok) {
    throw new Error(`Failed to load overview snapshot (${fallbackResponse.status})`)
  }
  return fallbackResponse.json()
}

async function logout() {
  await fetch(`${import.meta.env.BASE_URL}auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  window.location.href = `${import.meta.env.BASE_URL}login`
}

function agentPortrait(name: string) {
  const slug = name.toLowerCase()
  return `${import.meta.env.BASE_URL}agents/${slug}.png`
}

function agentPortraitClass(name: string) {
  const slug = name.toLowerCase()
  const map: Record<string, string> = {
    jarvis: 'scale-[1.08] object-center',
    elon: 'scale-[1.18] object-center',
    jensen: 'scale-[1.10] object-center',
    trinity: 'scale-[1.10] object-center',
  }
  return map[slug] ?? 'scale-[1.10] object-center'
}

function App() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    refetchInterval: 30000,
  })

  const isLive = Boolean(data?.auth)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Richard's Enterprise Dashboard</p>
            <h1 className="text-3xl font-semibold text-white">Jarvis Mission Control</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Live signal view of health, agents, automations, and intervention points. Built for fast decisions, not dashboard theater.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>{data?.fetchedAt ? `Last refresh: ${new Date(data.fetchedAt).toLocaleString()}` : 'Waiting for first live snapshot...'}</span>
              {isLive ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                  <Lock className="h-3.5 w-3.5" /> Private live mode
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {isLive ? (
              <button
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            ) : (
              <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
                <Zap className="h-4 w-4" /> Quick actions
              </button>
            )}
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {(error as Error).message}
          </div>
        ) : null}

        {data?.llmOverview ? (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Models</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.llmOverview.activeModels.length > 0 ? (
                    data.llmOverview.activeModels.map((m) => (
                      <span key={m} className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None active</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Token Volume (24h)</div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-semibold text-white">{(data.llmOverview.totalTokens24h / 1000).toFixed(1)}k</div>
                  <div className="flex flex-col items-end">
                    {Object.entries(data.llmOverview.providerBreakdown).map(([p, v]) => (
                      <span key={p} className="text-[9px] text-slate-500 uppercase leading-tight">
                        {p}: {(v / 1000).toFixed(1)}k
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Hottest Session</div>
                </div>
                {data.llmOverview.hottestSession ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate max-w-[120px]">{data.llmOverview.hottestSession.agentId}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{data.llmOverview.hottestSession.model}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {(data.llmOverview.hottestSession.tokens / 1000).toFixed(1)}k tokens · ID: {data.llmOverview.hottestSession.id.slice(0, 8)}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No active sessions</div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Performance</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Latency</div>
                    <div className="text-sm font-medium text-white">{data.llmOverview.reliability?.avgLatencyMs ?? '—'}ms</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase">Success</div>
                    <div className={`text-sm font-medium ${data.llmOverview.reliability?.successRate && data.llmOverview.reliability.successRate < 95 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {data.llmOverview.reliability?.successRate ?? '—'}%
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {data.llmOverview.estimatedCost24h !== undefined || data.llmOverview.cacheUsage || data.llmOverview.sessionStats ? (
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                {data.llmOverview.estimatedCost24h !== undefined && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Est. 24h Cost</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">${data.llmOverview.estimatedCost24h.toFixed(2)}</span>
                  </div>
                )}
                {data.llmOverview.cacheUsage && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Cache Hit Rate</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">{(data.llmOverview.cacheUsage.hitRate * 100).toFixed(0)}%</span>
                  </div>
                )}
                {data.llmOverview.sessionStats && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Sessions</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">
                      {data.llmOverview.sessionStats.active} active <span className="text-slate-600 mx-1">/</span> {data.llmOverview.sessionStats.warm} warm
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </>
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
                        <div className="h-14 w-14 overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-lg shadow-slate-950/40">
                          <img
                            src={agentPortrait(agent.name)}
                            alt={`${agent.name} portrait`}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              const target = event.currentTarget
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling as HTMLDivElement | null
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                          <div
                            className={`hidden h-full w-full items-center justify-center bg-gradient-to-br ${agent.avatarClass} text-sm font-semibold tracking-wide text-white`}
                          >
                            {agent.initials}
                          </div>
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
                {data?.auth ? (
                  <li className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    Access mode: <span className="font-medium text-emerald-300">{data.auth.via}</span>
                    {data.auth.publicOrigin ? <div className="mt-1 text-slate-400">Origin: {data.auth.publicOrigin}</div> : null}
                  </li>
                ) : null}
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

            <Panel title="Routing policy" icon={<Lock className="h-4 w-4" />}>
              <RoutingPolicyCard data={data?.raw?.routingPolicy} />
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

function AttentionCard({ title, detail }: { title: string; detail: string }) {
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
