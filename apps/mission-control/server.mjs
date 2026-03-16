import express from 'express'
import cors from 'cors'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const execFileAsync = promisify(execFile)
const app = express()
const PORT = Number(process.env.MISSION_CONTROL_API_PORT || 8787)
const workspaceRoot = path.resolve(process.cwd(), '..', '..')
const openClawStateDir = path.join(os.homedir(), '.openclaw')
const cronJobsPath = path.join(openClawStateDir, 'cron', 'jobs.json')
const openclawLogDir = path.join(process.env.LOCALAPPDATA || '', 'Temp', 'openclaw')
const routingPolicyPath = path.join(process.cwd(), 'routing-policy.json')

app.use(cors())

async function runOpenClaw(args) {
  const { stdout } = await execFileAsync('cmd.exe', ['/d', '/s', '/c', 'openclaw', ...args], {
    cwd: workspaceRoot,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 8,
  })
  return JSON.parse(stdout)
}

async function safeRun(args, fallback = null) {
  try {
    return await runOpenClaw(args)
  } catch (error) {
    return fallback ?? { error: error instanceof Error ? error.message : String(error) }
  }
}

function healthFromBool(ok) {
  return ok ? 'healthy' : 'critical'
}

function formatRelativeMs(ageMs) {
  const seconds = Math.max(0, Math.floor(ageMs / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function inferAgentState(agentId, sessions) {
  const recent = sessions.filter((session) => session.agentId === agentId)
  if (recent.length === 0) return 'Idle'
  const freshest = recent[0]
  if (freshest.ageMs < 10 * 60 * 1000) return 'Active'
  if (freshest.ageMs < 60 * 60 * 1000) return 'Warm'
  return 'Idle'
}

function prettyAgentName(agentId) {
  return agentId.charAt(0).toUpperCase() + agentId.slice(1)
}

function initialsForAgent(agentId) {
  const map = { main: 'JV', operator: 'JV', elon: 'EL', jensen: 'JN', trinity: 'TR' }
  return map[agentId] || agentId.slice(0, 2).toUpperCase()
}

function avatarClassForAgent(agentId) {
  const map = {
    main: 'from-cyan-500 to-blue-600',
    operator: 'from-cyan-500 to-blue-600',
    elon: 'from-amber-400 to-orange-600',
    jensen: 'from-emerald-400 to-teal-600',
    trinity: 'from-fuchsia-400 to-pink-600',
  }
  return map[agentId] || 'from-slate-500 to-slate-700'
}

async function readCronJobs() {
  const raw = await fs.readFile(cronJobsPath, 'utf8')
  return JSON.parse(raw)
}

async function findLatestOpenClawLog() {
  const entries = await fs.readdir(openclawLogDir, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && /^openclaw-.*\.log$/i.test(entry.name))
  if (files.length === 0) return null

  const stats = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(openclawLogDir, file.name)
      const stat = await fs.stat(fullPath)
      return { fullPath, mtimeMs: stat.mtimeMs }
    }),
  )

  stats.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return stats[0]?.fullPath ?? null
}

function parseLogEvents(lines) {
  const events = []
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      const text = [entry['1'], entry['2']].filter(Boolean).join(' ')
      const time = typeof entry.time === 'string' ? entry.time.slice(11, 16) : '--:--'
      const lower = text.toLowerCase()
      let severity = 'healthy'
      if (lower.includes('missing scope') || lower.includes('handshake timeout') || lower.includes('error')) severity = 'warning'
      if (lower.includes('critical')) severity = 'critical'
      if (
        lower.includes('missing scope') ||
        lower.includes('handshake timeout') ||
        lower.includes('health-monitor: restarting') ||
        lower.includes('logged in to discord') ||
        lower.includes('deploy-commands:done')
      ) {
        events.push({
          time,
          severity,
          title: text.split(' ').slice(0, 8).join(' '),
          detail: text,
        })
      }
    } catch {
      // ignore non-JSON lines
    }
  }
  return events.slice(-8).reverse()
}

app.get('/api/overview', async (_req, res) => {
  try {
    const [status, gatewayStatus, health, sessionsResult, cronJobsStore, latestLogPath] = await Promise.all([
      safeRun(['status', '--json']),
      safeRun(['gateway', 'status', '--json']),
      safeRun(['health', '--json']),
      safeRun(['sessions', '--all-agents', '--active', '1440', '--json']),
      readCronJobs(),
      findLatestOpenClawLog(),
    ])

    const sessions = Array.isArray(sessionsResult?.sessions) ? sessionsResult.sessions : []
    const jobs = Array.isArray(cronJobsStore?.jobs) ? cronJobsStore.jobs : []
    const logLines = latestLogPath ? (await fs.readFile(latestLogPath, 'utf8')).trim().split(/\r?\n/).slice(-250) : []
    const events = parseLogEvents(logLines)

    const gatewayReachable = Boolean(gatewayStatus?.rpc?.ok)
    const scopeIssue = logLines.some((line) => line.includes('missing scope: operator.read'))
    const disconnectedChannels = Object.values(health?.channels || {}).filter((channel) => channel?.configured && !channel?.running).length
    const activeSessions = sessions.filter((session) => session.ageMs < 60 * 60 * 1000)
    const failingJobs = jobs.filter((job) => (job.state?.consecutiveErrors || 0) > 0 || job.state?.lastStatus === 'error')

    const agentIds = ['operator', 'elon', 'jensen', 'trinity']
    const agents = agentIds.map((agentId) => {
      const agentSessions = sessions.filter((session) => session.agentId === agentId)
      const freshest = agentSessions[0]
      return {
        name: prettyAgentName(agentId === 'operator' ? 'Jarvis' : agentId),
        state: inferAgentState(agentId, sessions),
        model: freshest?.model || 'n/a',
        focus:
          agentId === 'operator'
            ? 'Operator orchestration'
            : agentId === 'elon'
              ? 'Engineering tasks'
              : agentId === 'jensen'
                ? 'Research tasks'
                : 'Comms + approvals',
        initials: initialsForAgent(agentId),
        avatarClass: avatarClassForAgent(agentId),
        note: freshest ? `Last active ${formatRelativeMs(freshest.ageMs)}` : 'No recent sessions',
      }
    })

    const automations = jobs.map((job) => ({
      name: job.name,
      state:
        !job.enabled ? 'disabled' : job.state?.lastStatus === 'ok' ? 'healthy' : job.state?.lastStatus === 'error' ? 'error' : 'unknown',
      detail: job.state?.nextRunAtMs ? `Next ${new Date(job.state.nextRunAtMs).toLocaleString()}` : 'No next run scheduled',
    }))

    const missionControlLane = routingPolicy?.lanes?.missionControlUpdate?.modelOrder?.join(' -> ')

    const attention = [
      scopeIssue
        ? { title: 'Repair gateway auth path', detail: 'Control UI requests are hitting missing operator.read scope.' }
        : null,
      disconnectedChannels > 0
        ? { title: 'Channel recovery watch', detail: `${disconnectedChannels} configured channel(s) not currently marked running.` }
        : null,
      failingJobs.length > 0
        ? { title: 'Review failing automation', detail: `${failingJobs.length} cron job(s) have recent errors.` }
        : null,
      missionControlLane
        ? { title: 'Mission Control update lane', detail: `Low-complexity Mission Control passes route via ${missionControlLane}.` }
        : null,
    ].filter(Boolean)

    const stats = [
      {
        label: 'Gateway',
        value: gatewayReachable ? 'Reachable' : 'Down',
        health: gatewayReachable ? (scopeIssue ? 'warning' : 'healthy') : 'critical',
        note: scopeIssue ? 'Gateway responds, but operator scope is failing in dashboard path' : 'RPC probe healthy',
      },
      {
        label: 'Pending approvals',
        value: scopeIssue ? 'Unknown' : '0',
        health: scopeIssue ? 'warning' : 'healthy',
        note: scopeIssue ? 'Approval feed not wired yet; auth issue still visible in logs' : 'No live approval adapter yet',
      },
      {
        label: 'Active sessions',
        value: String(activeSessions.length),
        health: activeSessions.length > 0 ? 'healthy' : 'warning',
        note: `${sessions.length} sessions seen in the last 24h`,
      },
      {
        label: 'Cron failures',
        value: String(failingJobs.length),
        health: failingJobs.length > 0 ? 'warning' : 'healthy',
        note: `${jobs.length} cron jobs loaded from local store`,
      },
    ]

    res.json({
      fetchedAt: new Date().toISOString(),
      stats,
      agents,
      events,
      attention,
      automations,
      raw: {
        status,
        gatewayStatus,
        health,
        routingPolicy,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

app.listen(PORT, () => {
  console.log(`Mission Control API listening on http://127.0.0.1:${PORT}`)
})
