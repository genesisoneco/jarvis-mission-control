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

const stats: Stat[] = [
  { label: 'Gateway', value: 'Degraded', health: 'warning', note: 'Loopback reachable, admin auth unstable' },
  { label: 'Pending approvals', value: '3', health: 'warning', note: '1 sensitive, 2 routine' },
  { label: 'Active sessions', value: '15', health: 'healthy', note: 'Mixed agent + cron activity' },
  { label: 'Cron failures', value: '1', health: 'warning', note: 'Last 24h' },
]

const events: EventItem[] = [
  {
    time: '23:22',
    severity: 'warning',
    title: 'Gateway auth scope issue',
    detail: 'Control UI session missing operator.read; reconnect path needed.',
  },
  {
    time: '23:18',
    severity: 'healthy',
    title: 'Discord provider recovered',
    detail: 'Health monitor restarted the provider and restored connectivity.',
  },
  {
    time: '22:54',
    severity: 'critical',
    title: 'Cron timeout',
    detail: 'One research task exceeded timeout budget and fell back.',
  },
]

const agents = [
  { name: 'Jarvis', state: 'Active', model: 'gpt-5.4', focus: 'Operator orchestration' },
  { name: 'Elon', state: 'Idle', model: 'fallback-aware', focus: 'Engineering tasks' },
  { name: 'Jensen', state: 'Scheduled', model: 'gemini-flash', focus: 'Research cron runs' },
  { name: 'Trinity', state: 'Standby', model: 'local-qwen', focus: 'Comms + approvals' },
]

const healthClasses: Record<Health, string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
}

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Jarvis Mission Control</p>
            <h1 className="text-3xl font-semibold text-white">Operator dashboard for OpenClaw</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              High-signal view of health, approvals, agents, and interventions. Built for fast decisions, not dashboard theater.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              <Zap className="h-4 w-4" /> Quick actions
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <span className={`rounded-full border px-2 py-1 text-xs ${healthClasses[stat.health]}`}>
                  {stat.health}
                </span>
              </div>
              <div className="text-3xl font-semibold text-white">{stat.value}</div>
              <p className="mt-2 text-sm text-slate-400">{stat.note}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-6">
            <Panel title="Active agents" icon={<Bot className="h-4 w-4" />}>
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div key={agent.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{agent.name}</div>
                        <div className="text-sm text-slate-400">{agent.focus}</div>
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
                {events.map((event) => (
                  <div key={`${event.time}-${event.title}`} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-1 flex items-center justify-between">
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
              <AttentionItem title="Repair gateway auth path" detail="Refresh admin token and invalidate stale dashboard session." />
              <AttentionItem title="Review pending approvals" detail="One sensitive action requires Tier 1 confirmation." />
              <AttentionItem title="Inspect cron timeout" detail="Research job exceeded budget and needs prompt/runtime tuning." />
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
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">Do not expose noisy logs by default; summarize first.</li>
              </ul>
            </Panel>

            <Panel title="Automation status" icon={<Clock3 className="h-4 w-4" />}>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">Jarvis Daily Briefing — healthy</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">Research Lab Scout — warning</li>
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">Heartbeat jobs — mostly disabled</li>
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

function AttentionItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="font-medium text-amber-200">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </div>
  )
}

function ActionButton({ label }: { label: string }) {
  return (
    <button className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800">
      {label}
    </button>
  )
}

export default App
