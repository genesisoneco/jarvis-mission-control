import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

const execFileAsync = promisify(execFile)
const app = express()

const PORT = Number(process.env.MISSION_CONTROL_API_PORT || process.env.PORT || 8787)
const workspaceRoot = path.resolve(process.cwd(), '..', '..')
const openClawStateDir = path.join(os.homedir(), '.openclaw')
const cronJobsPath = path.join(openClawStateDir, 'cron', 'jobs.json')
const openclawLogDir = path.join(process.env.LOCALAPPDATA || '', 'Temp', 'openclaw')
const routingPolicyPath = path.join(process.cwd(), 'routing-policy.json')
const distDir = path.join(process.cwd(), 'dist')
const accessToken = (process.env.MISSION_CONTROL_ACCESS_TOKEN || '').trim()
const cookieName = process.env.MISSION_CONTROL_COOKIE_NAME || 'mission_control_session'
const publicOrigin = (process.env.MISSION_CONTROL_PUBLIC_ORIGIN || '').trim()
const disableLocalBypass = /^(1|true|yes)$/i.test(process.env.MISSION_CONTROL_DISABLE_LOCAL_BYPASS || '')

const routingPolicy = await fs
  .readFile(routingPolicyPath, 'utf8')
  .then((raw) => JSON.parse(raw))
  .catch(() => null)

app.disable('x-powered-by')
app.set('trust proxy', true)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseCookies(header = '') {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return acc
      const key = decodeURIComponent(part.slice(0, separatorIndex).trim())
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim())
      acc[key] = value
      return acc
    }, {})
}

function serializeCookie(name, value, req, overrides = {}) {
  const isHttps = publicOrigin.startsWith('https://') || req.secure || req.get('x-forwarded-proto') === 'https'
  const attributes = {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    secure: isHttps,
    ...overrides,
  }

  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]
  if (attributes.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(attributes.maxAge))}`)
  if (attributes.path) parts.push(`Path=${attributes.path}`)
  if (attributes.httpOnly) parts.push('HttpOnly')
  if (attributes.sameSite) parts.push(`SameSite=${attributes.sameSite}`)
  if (attributes.secure) parts.push('Secure')
  return parts.join('; ')
}

function loopbackRequested(req) {
  const forwardedFor = req.get('x-forwarded-for')
  const remoteAddress = forwardedFor?.split(',')[0]?.trim() || req.socket.remoteAddress || ''
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress)
}

function authenticated(req) {
  if (!accessToken) {
    return !disableLocalBypass && loopbackRequested(req)
  }

  const cookies = parseCookies(req.headers.cookie)
  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const headerToken = req.get('x-mission-control-token')?.trim()
  const cookieToken = cookies[cookieName]?.trim()

  return [bearer, headerToken, cookieToken].some((value) => value && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(accessToken)))
}

function ensureAuthenticated(req, res, next) {
  if (authenticated(req)) {
    return next()
  }

  const requestPath = `${req.baseUrl || ''}${req.path || ''}`
  if (requestPath.startsWith('/api/')) {
    return res.status(401).json({
      error: accessToken
        ? 'Authentication required. Log in via /login or send Authorization: Bearer <MISSION_CONTROL_ACCESS_TOKEN>.'
        : 'Remote access is disabled until MISSION_CONTROL_ACCESS_TOKEN is configured on the host.',
    })
  }

  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl || '/')}`)
}

function loginPage({ error = '', next = '/', remoteLocked = false }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mission Control login</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #020617, #0f172a); color: #e2e8f0; }
    .card { width: min(420px, calc(100vw - 32px)); border: 1px solid rgba(148,163,184,.18); background: rgba(15,23,42,.88); border-radius: 20px; padding: 28px; box-shadow: 0 24px 60px rgba(2,6,23,.45); }
    .eyebrow { font-size: 12px; letter-spacing: .24em; text-transform: uppercase; color: #67e8f9; margin-bottom: 10px; }
    h1 { margin: 0 0 10px; font-size: 28px; }
    p { color: #94a3b8; line-height: 1.5; }
    label { display: block; margin: 20px 0 8px; font-size: 13px; color: #cbd5e1; }
    input { width: 100%; box-sizing: border-box; border-radius: 12px; border: 1px solid #334155; background: #020617; color: white; padding: 14px 16px; font-size: 15px; }
    button { margin-top: 16px; width: 100%; border: 0; border-radius: 12px; padding: 14px 16px; font-size: 15px; font-weight: 600; background: #06b6d4; color: #082f49; cursor: pointer; }
    button:hover { background: #22d3ee; }
    .error { margin-top: 14px; border-radius: 12px; padding: 12px 14px; background: rgba(244,63,94,.12); color: #fecdd3; border: 1px solid rgba(244,63,94,.25); }
    .note { margin-top: 14px; font-size: 13px; color: #64748b; }
    code { color: #e2e8f0; }
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Jarvis Mission Control</div>
    <h1>Private live dashboard</h1>
    <p>Runtime state stays on this machine. Log in with the Mission Control access token to view live status remotely.</p>
    ${remoteLocked ? '<div class="error">Remote access is disabled because <code>MISSION_CONTROL_ACCESS_TOKEN</code> is not configured on the host yet.</div>' : ''}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="post" action="/auth/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}" />
      <label for="token">Access token</label>
      <input id="token" name="token" type="password" autocomplete="current-password" placeholder="Paste MISSION_CONTROL_ACCESS_TOKEN" ${remoteLocked ? 'disabled' : ''} required />
      <button type="submit" ${remoteLocked ? 'disabled' : ''}>Open Mission Control</button>
    </form>
    <div class="note">Tip: use a tunnel or private network in front of this app, but keep the token anyway. Defense in depth beats regret.</div>
  </main>
</body>
</html>`
}

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

function stripAnsi(value) {
  return String(value)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\x1B\[[0-9;]*m/g, '')
    .replace(/\[[0-9;]*m/g, '')
    .replace(/\[\d+m/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function summarizeLogEvent(text) {
  const clean = stripAnsi(text)
  const lower = clean.toLowerCase()

  if (lower.includes('missing scope') && lower.includes('operator.read')) {
    return {
      key: 'missing-operator-read-scope',
      severity: 'warning',
      title: 'Operator API auth scope missing',
      detail: 'Mission Control cannot read some live runtime data because operator.read scope is missing.',
    }
  }

  if (lower.includes('handshake timeout')) {
    return {
      key: 'channel-handshake-timeout',
      severity: 'warning',
      title: 'Channel handshake timed out',
      detail: 'A channel connection or auth handshake timed out. Live channel data may be delayed until it reconnects.',
    }
  }

  if (lower.includes('health-monitor: restarting')) {
    return {
      key: 'health-monitor-restarting',
      severity: 'warning',
      title: 'Health monitor restarted a service',
      detail: 'OpenClaw detected an unhealthy component and restarted it automatically.',
    }
  }

  if (lower.includes('eperm') && lower.includes('rename') && lower.includes('pending.json')) {
    return {
      key: 'device-pending-file-lock',
      severity: 'warning',
      title: 'Device state file update failed',
      detail: 'Windows blocked an update to the pending device-state file. Pairing or device status may be temporarily stale until the next successful write.',
    }
  }

  if (lower.includes('failovererror') && lower.includes('llm request timed out')) {
    return {
      key: 'llm-request-timeout',
      severity: 'warning',
      title: 'Model request timed out',
      detail: 'An agent task exceeded the LLM timeout window. Some automation results may be delayed, retried, or incomplete.',
    }
  }

  if (lower.includes('lane task error')) {
    return {
      key: 'agent-lane-task-error',
      severity: 'warning',
      title: 'Agent lane task failed',
      detail: 'A routed agent task hit an execution error. Check the related agent/session if this keeps repeating.',
    }
  }

  if (lower.includes('cron: applying error backoff')) {
    return {
      key: 'cron-error-backoff',
      severity: 'warning',
      title: 'Scheduled job entered backoff',
      detail: 'A cron routine hit repeated errors, so OpenClaw increased the delay before the next retry.',
    }
  }

  if (lower.includes('logged in to discord')) {
    return {
      key: 'discord-login-ok',
      severity: 'healthy',
      title: 'Discord connection restored',
      detail: 'The Discord client logged in successfully and is connected again.',
    }
  }

  if (lower.includes('deploy-commands:done')) {
    return {
      key: 'discord-commands-deployed',
      severity: 'healthy',
      title: 'Discord commands deployed',
      detail: 'Discord application commands finished deploying successfully.',
    }
  }

  if (lower.includes('critical')) {
    return {
      key: `critical-${lower.slice(0, 40)}`,
      severity: 'critical',
      title: 'Critical runtime issue detected',
      detail: 'OpenClaw reported a critical runtime problem. Inspect the affected component if the issue persists.',
    }
  }

  if (lower.includes('error')) {
    return {
      key: `error-${lower.slice(0, 40)}`,
      severity: 'warning',
      title: 'Runtime warning',
      detail: 'OpenClaw logged a warning/error event that may need follow-up if it repeats.',
    }
  }

  return null
}

function parseLogEvents(lines) {
  const events = []
  const seen = new Set()

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      const text = [entry['1'], entry['2']].filter(Boolean).join(' ')
      const summary = summarizeLogEvent(text)
      if (!summary) continue

      const time = typeof entry.time === 'string' ? entry.time.slice(11, 16) : '--:--'
      const dedupeKey = `${summary.key}:${summary.title}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      events.push({
        time,
        severity: summary.severity,
        title: summary.title,
        detail: summary.detail,
      })
    } catch {
      // ignore non-JSON lines
    }
  }

  return events.slice(-8).reverse()
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, authConfigured: Boolean(accessToken), publicOrigin: publicOrigin || null })
})

app.get('/login', (req, res) => {
  const next = typeof req.query.next === 'string' ? req.query.next : '/'
  res.type('html').send(loginPage({ next, remoteLocked: !accessToken }))
})

app.post('/auth/login', (req, res) => {
  const next = typeof req.body?.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/'
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''

  if (!accessToken) {
    return res.status(503).type('html').send(loginPage({ next, remoteLocked: true }))
  }

  if (!token || token.length !== accessToken.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(accessToken))) {
    return res.status(401).type('html').send(loginPage({ next, error: 'Invalid access token.', remoteLocked: false }))
  }

  res.setHeader('Set-Cookie', serializeCookie(cookieName, accessToken, req, { maxAge: 60 * 60 * 24 * 14 }))
  return res.redirect(next)
})

app.post('/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', serializeCookie(cookieName, '', req, { maxAge: 0 }))
  res.status(204).end()
})

app.use('/api', ensureAuthenticated)

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

    const llmOverview = {
      activeModels: [...new Set(activeSessions.map((s) => s.model))].filter(Boolean),
      totalTokens24h: sessions.reduce((acc, s) => acc + (s.totalTokens || 0), 0),
      providerBreakdown: sessions.reduce((acc, s) => {
        if (s.modelProvider) {
          acc[s.modelProvider] = (acc[s.modelProvider] || 0) + (s.totalTokens || 0)
        }
        return acc
      }, {}),
      hottestSession: activeSessions[0]
        ? {
            id: activeSessions[0].sessionId,
            agentId: activeSessions[0].agentId,
            tokens: activeSessions[0].totalTokens,
            model: activeSessions[0].model,
          }
        : null,
      reliability: {
        successRate: 100, // TODO: derive from gateway logs if possible
        recentFailures: 0,
        avgLatencyMs: 0,
      },
      sessionStats: {
        active: activeSessions.length,
        warm: sessions.length - activeSessions.length,
      }
    }

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
      llmOverview,
      auth: {
        required: Boolean(accessToken),
        via: accessToken ? 'token-or-cookie' : 'loopback-only',
        publicOrigin: publicOrigin || null,
      },
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

if (await fs.stat(distDir).then(() => true).catch(() => false)) {
  app.use(ensureAuthenticated)
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return
        }

        if (/\\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.get('/', ensureAuthenticated, (_req, res) => {
    res
      .type('html')
      .send('<p style="font-family:system-ui;padding:24px">Mission Control build not found. Run <code>npm run build</code> in <code>apps/mission-control</code> first.</p>')
  })
}

app.listen(PORT, () => {
  console.log(`Mission Control API listening on http://127.0.0.1:${PORT}`)
  if (publicOrigin) {
    console.log(`Mission Control public origin: ${publicOrigin}`)
  }
  if (accessToken) {
    console.log('Mission Control auth: enabled')
  } else if (!disableLocalBypass) {
    console.log('Mission Control auth: loopback-only (set MISSION_CONTROL_ACCESS_TOKEN for remote access)')
  } else {
    console.log('Mission Control auth: locked (set MISSION_CONTROL_ACCESS_TOKEN to enable access)')
  }
})
