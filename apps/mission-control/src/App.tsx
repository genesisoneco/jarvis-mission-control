import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Clock3,
  Coins,
  Cpu,
  Layers,
  Lock,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Timer,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react'
import VirtualWorkspace from './components/VirtualWorkspace'
import { attentionAgentMatch, deriveTaskHints } from './components/workspace/intelligence'
import type { ActivityState, AgentIntent, AgentMood, EventItem, Health, OfficeSceneState, Presence, WorkspaceAgent, WorkspaceHandoff } from './components/workspace/types'

type Stat = {
  label: string
  value: string
  health: Health
  note: string
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

type AgentStatus = {
  agent: string
  activity: string
  workspaceArea?: string | null
  task?: string | null
  startedAt?: string | null
  updatedAt?: string | null
}

type RawSession = {
  agentId: string
  key: string
  kind?: string
  sessionId?: string
  updatedAt?: number
  age?: number
  ageMs?: number
  model?: string
  totalTokens?: number | null
  totalTokensFresh?: boolean
  percentUsed?: number | null
  remainingTokens?: number | null
  contextTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  cacheRead?: number | null
  thinkingLevel?: string
  abortedLastRun?: boolean
  flags?: string[]
  systemSent?: boolean
  label?: string
  displayName?: string
  spawnedBy?: string
  shortLabel?: string
  taskSummary?: string
  taskSummarySource?: string
  explicitActivityState?: ActivityState
  explicitActivityLabel?: string
  explicitActivitySource?: string
  explicitActivityConfidence?: 'high' | 'medium' | 'low'
  collaboration?: {
    linkedSessionKey?: string
    linkedAgentId?: string
    relation?: 'parent' | 'child'
    sharedTask?: string | null
    source?: string
    confidence?: 'high' | 'medium' | 'low'
  } | null
}

type RawCollaboration = {
  fromAgentId: string
  toAgentId: string
  fromSessionKey: string
  toSessionKey: string
  sharedTask?: string | null
  reason: string
  mode: 'delegation' | 'handoff'
  explicit: boolean
  ageGapMs: number
  confidence?: 'high' | 'medium' | 'low'
}

type RawStatus = {
  gateway?: {
    reachable?: boolean
    error?: string | null
  }
  sessions?: {
    allActive?: RawSession[]
    byAgent?: Array<{
      agentId: string
      recent?: RawSession[]
    }>
  }
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
    status?: RawStatus
    sessions?: {
      sessions?: RawSession[]
      collaborations?: RawCollaboration[]
    }
    health?: {
      channels?: Record<string, { configured?: boolean; running?: boolean }>
    }
    gatewayStatus?: {
      rpc?: { ok?: boolean }
      gateway?: { probeUrl?: string }
    }
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

const presenceClasses: Record<Presence, string> = {
  active: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  warm: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
  standby: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300',
  idle: 'border-slate-600 bg-slate-800/80 text-slate-300',
  blocked: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  preview: 'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300',
}

const stationMeta = [
  {
    id: 'jarvis',
    name: 'Jarvis',
    station: 'Command bridge',
    stationTheme: 'Routing, approvals, runtime oversight',
    focus: 'Top-level orchestration, approvals, verification, synthesis',
    sourceAgents: ['operator', 'main'],
    avatarClass: 'from-cyan-500 via-sky-500 to-blue-600',
    initials: 'JV',
    icon: Sparkles,
  },
  {
    id: 'elon',
    name: 'Elon',
    station: 'Build bay',
    stationTheme: 'Implementation, debugging, shipping',
    focus: 'Engineering execution, architecture, refactors, tooling',
    sourceAgents: ['elon'],
    avatarClass: 'from-amber-400 via-orange-500 to-red-500',
    initials: 'EL',
    icon: Wrench,
  },
  {
    id: 'jensen',
    name: 'Jensen',
    station: 'Research garden',
    stationTheme: 'Investigation, synthesis, evidence gathering',
    focus: 'Research, fact-finding, scans, evidence-backed recommendations',
    sourceAgents: ['jensen'],
    avatarClass: 'from-emerald-400 via-teal-500 to-cyan-600',
    initials: 'JN',
    icon: Search,
  },
  {
    id: 'trinity',
    name: 'Trinity',
    station: 'Comms lounge',
    stationTheme: 'Messages, reminders, coordination',
    focus: 'Communication, inbox triage, reminders, docs, human-facing coordination',
    sourceAgents: ['trinity'],
    avatarClass: 'from-fuchsia-400 via-pink-500 to-rose-500',
    initials: 'TR',
    icon: MessageSquare,
  },
] as const

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

async function restartGatewayAction() {
  const response = await fetch(`${import.meta.env.BASE_URL}api/actions/restart-gateway`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `Gateway restart failed (${response.status})`)
  }

  return response.json()
}

function formatRelativeMs(ageMs: number | null | undefined) {
  if (ageMs == null) return 'no recent activity'
  const seconds = Math.max(0, Math.floor(ageMs / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatTokenVolume(tokens: number | null | undefined) {
  if (tokens == null) return 'n/a'
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return `${tokens}`
}

function workloadProfile(session: RawSession | null, presence: Presence): { label: string; tone: Health } {
  if (!session) {
    return presence === 'preview' ? { label: 'Preview profile', tone: 'warning' } : { label: 'No measured load', tone: 'healthy' }
  }

  const percentUsed = session.percentUsed ?? 0
  const totalTokens = session.totalTokens ?? 0
  if (presence === 'blocked') return { label: 'Intervention likely needed', tone: 'critical' }
  if (percentUsed >= 85 || totalTokens >= 120_000) return { label: 'Heavy context pressure', tone: 'critical' }
  if (percentUsed >= 60 || totalTokens >= 45_000) return { label: 'High active load', tone: 'warning' }
  if (presence === 'active' || presence === 'warm') return { label: 'Light active load', tone: 'healthy' }
  return { label: 'Standing by cleanly', tone: 'healthy' }
}

async function fetchAgentStatus(): Promise<AgentStatus[]> {
  const apiUrl = `${import.meta.env.BASE_URL}api/agent-status`

  try {
    const response = await fetch(apiUrl, { credentials: 'include' })
    if (response.ok) {
      const json = await response.json()
      return Array.isArray(json.agents) ? (json.agents as AgentStatus[]) : []
    }
  } catch {
    // ignore status errors; fall back to empty list
  }

  return []
}

function truthLabelForAgent(agent: Pick<WorkspaceAgent, 'presence' | 'activityLabel' | 'activityConfidence'>, data: OverviewResponse) {
  if (!data.auth) return 'Bundled preview snapshot'
  const confidence = activityConfidenceLabel(agent.activityConfidence).toLowerCase()
  if (agent.presence === 'blocked') return `${agent.activityLabel} · ${confidence} runtime truth`
  return `${agent.activityLabel} · ${confidence} runtime truth`
}

function buildObservations(
  agent: Pick<WorkspaceAgent, 'presence' | 'freshestSession' | 'freshestAgeMs' | 'eventMatches' | 'tokens' | 'percentUsed' | 'intent' | 'liveReason' | 'primaryTaskHint' | 'taskHints' | 'activityLabel' | 'activitySource' | 'activityConfidence'>,
  data: OverviewResponse,
) {
  const observations: string[] = []
  if (!data.auth) observations.push('Static preview fallback; no machine-local runtime attached.')
  if (agent.freshestSession) observations.push(`Recent session seen ${formatRelativeMs(agent.freshestAgeMs)}.`)
  observations.push(`${agent.activityLabel} from ${agent.activitySource.toLowerCase()} (${activityConfidenceLabel(agent.activityConfidence).toLowerCase()}).`)
  if (agent.primaryTaskHint) {
    observations.push(`Primary task hint: ${agent.primaryTaskHint.label.toLowerCase()} (${agent.primaryTaskHint.source}).`)
  } else if (agent.taskHints[0]) {
    observations.push(`Task hints: ${agent.taskHints.map((hint) => hint.label.toLowerCase()).join(', ')}.`)
  }
  if (agent.tokens != null) observations.push(`${formatTokenVolume(agent.tokens)} total tokens recorded for the freshest session.`)
  if (agent.percentUsed != null) observations.push(`${agent.percentUsed}% of context window currently occupied.`)
  if (agent.eventMatches[0]) observations.push(`Nearest event marker: ${agent.eventMatches[0].title}.`)
  observations.push(`Current sim intent: ${agent.intent}. ${agent.liveReason}`)
  if (agent.presence === 'blocked') observations.push('Execution itself appears interrupted; human review may be required.')
  if (agent.presence === 'idle' && data.auth) observations.push('No recent runtime evidence beyond the idle window.')
  return observations.slice(0, 4)
}

function getAgeMs(session: RawSession | null | undefined) {
  if (!session) return null
  if (typeof session.ageMs === 'number') return session.ageMs
  if (typeof session.age === 'number') return session.age
  if (typeof session.updatedAt === 'number') return Date.now() - session.updatedAt
  return null
}

function kindLabel(session: RawSession | null) {
  if (!session) return 'No live session'
  if (session.key.includes(':subagent:')) return 'Subagent task'
  if (session.key.includes(':cron:')) return 'Scheduled run'
  if (session.kind === 'group') return 'Channel session'
  if (session.kind === 'direct') return 'Direct session'
  return session.kind || 'Session'
}

function compactLabel(value: string | null | undefined, fallback: string | null = null) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return normalized.length > 72 ? `${normalized.slice(0, 69).trimEnd()}…` : normalized
}

function sessionLabel(session: RawSession | null) {
  if (!session) return null
  return compactLabel(session.shortLabel || session.label || session.displayName)
}

function sessionTaskSummary(session: RawSession | null, kind?: string, ageMs?: number | null, model?: string) {
  if (!session) return null
  const explicit = compactLabel(session.taskSummary || session.shortLabel || session.label || session.displayName)
  if (explicit) return explicit
  const pieces = [kind || kindLabel(session), model || session.model, ageMs != null ? formatRelativeMs(ageMs) : null].filter(Boolean)
  return pieces.length > 0 ? pieces.join(' · ') : null
}

function taskSourceLabel(session: RawSession | null) {
  if (!session?.taskSummarySource) return null
  return {
    'explicit-session-label': 'Explicit session label',
    'session-key-derivation': 'Session-key derivation',
    'session-kind-fallback': 'Session-kind fallback',
  }[session.taskSummarySource] ?? session.taskSummarySource
}

function activityConfidenceLabel(confidence?: 'high' | 'medium' | 'low') {
  return confidence === 'high' ? 'High confidence' : confidence === 'medium' ? 'Medium confidence' : 'Low confidence'
}

function agentIdToWorkspaceId(agentId: string | null | undefined) {
  const normalized = (agentId || '').toLowerCase()
  if (normalized === 'operator' || normalized === 'main') return 'jarvis'
  return normalized
}

function prettyAgentName(agentId: string | null | undefined) {
  const normalized = agentIdToWorkspaceId(agentId)
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown'
}

function collaborationConfidenceLabel(link: RawCollaboration) {
  if (link.explicit && link.confidence) return `${link.confidence} confidence explicit link`
  if (link.explicit) return 'explicit link'
  return link.ageGapMs <= 12 * 60 * 1000 ? 'tight window' : 'plausible window'
}

function collaborationGapLabel(link: RawCollaboration) {
  return `${Math.max(1, Math.round(link.ageGapMs / 60000))}m gap`
}

function inferPresence(
  session: RawSession | null,
  sessions: RawSession[],
  data: OverviewResponse,
  _sourceAgents: string[],
  hasTopLevelSignal = false,
  topLevelState?: string,
): Presence {
  if (!session) {
    if (!data.auth) return 'preview'
    return hasTopLevelSignal && topLevelState && topLevelState.toLowerCase() !== 'idle' ? 'standby' : 'idle'
  }

  const explicit = session.explicitActivityState
  if (explicit === 'blocked') return 'blocked'
  if (explicit === 'executing' || explicit === 'collaborating') return 'active'
  if (explicit === 'waiting_input' || explicit === 'cooldown') return 'warm'
  if (explicit === 'idle') return 'idle'

  const ageMs = getAgeMs(session) ?? Number.MAX_SAFE_INTEGER
  const activeKeys = new Set((data.raw?.status?.sessions?.allActive ?? []).map((item) => item.key))
  const stationHasExplicitActiveSession = sessions.some((item) => activeKeys.has(item.key))
  const hasRuntimePulse = Boolean(
    session.totalTokensFresh
    || session.systemSent
    || session.thinkingLevel
    || (session.flags?.length ?? 0) > 0
    || (session.percentUsed ?? 0) >= 20
    || (session.totalTokens ?? 0) >= 1200,
  )

  if (session.abortedLastRun) return 'blocked'
  if (activeKeys.has(session.key)) return 'active'
  if (ageMs < 12 * 60 * 1000 && hasRuntimePulse) return 'active'
  if (stationHasExplicitActiveSession && ageMs < 25 * 60 * 1000) return 'active'
  if (ageMs < 90 * 60 * 1000) return 'warm'
  if (ageMs < 6 * 60 * 60 * 1000) return 'standby'
  return hasTopLevelSignal && topLevelState && topLevelState.toLowerCase() !== 'idle' ? 'standby' : 'idle'
}

function stateLabelForPresence(presence: Presence) {
  return {
    active: 'Active now',
    warm: 'Recently active',
    standby: 'Standing by',
    idle: 'Idle',
    blocked: 'Blocked / degraded',
    preview: 'Preview',
  }[presence]
}

function eventAgentMatch(event: EventItem) {
  const text = `${event.title} ${event.detail}`.toLowerCase()
  if (text.includes('discord') || text.includes('channel') || text.includes('comms') || text.includes('email') || text.includes('calendar')) return 'trinity'
  if (text.includes('research') || text.includes('analysis') || text.includes('fact') || text.includes('evidence')) return 'jensen'
  if (text.includes('deploy') || text.includes('build') || text.includes('lane task') || text.includes('model request') || text.includes('bug') || text.includes('implementation')) return 'elon'
  return 'jarvis'
}

function inferSceneState(agent: Pick<WorkspaceAgent, 'id' | 'presence' | 'activityState'>, handoffIds: Set<string>): OfficeSceneState {
  if (agent.presence === 'preview') return 'preview'
  if (agent.presence === 'blocked' || agent.activityState === 'blocked') return 'blocked'
  if (handoffIds.has(agent.id) || agent.activityState === 'collaborating') return 'handoff'
  if (agent.activityState === 'executing' || agent.presence === 'active') return 'active'
  if (agent.activityState === 'waiting_input' || agent.activityState === 'cooldown' || agent.presence === 'warm' || agent.presence === 'standby') return 'waiting'
  return 'idle'
}

function sceneLabelForState(state: OfficeSceneState) {
  return {
    active: 'Working',
    handoff: 'Collaborating',
    waiting: 'Waiting',
    idle: 'Idle',
    blocked: 'Blocked',
    preview: 'Preview',
  }[state]
}

function sceneNoteForAgent(agent: WorkspaceAgent) {
  if (agent.sceneState === 'handoff') return 'Only the tightest recent baton pass gets pulled into the strategy table; everyone else should stay anchored to their actual work zone.'
  if (agent.sceneState === 'blocked') return 'A run appears to have aborted, so the character gets pulled toward the alert wall for intervention.'
  if (agent.sceneState === 'active') return 'Fresh runtime evidence keeps this station lit, moving, and interacting with props.'
  if (agent.sceneState === 'waiting') return 'Recently active, now parked between turns with short hallway loops and small desk motions.'
  if (agent.sceneState === 'preview') return 'Bundled preview character, not a live runtime feed.'
  return 'Quiet desk with no defensible recent work signal, so the character idles or wanders to the break nook.'
}

function inferMood(agent: { presence: Presence; activityState: ActivityState; percentUsed: number | null; eventMatches: EventItem[]; sceneState: OfficeSceneState }): AgentMood {
  if (agent.presence === 'blocked' || agent.activityState === 'blocked') return 'blocked'
  if (agent.eventMatches.some((event) => event.severity === 'critical')) return 'alert'
  if ((agent.percentUsed ?? 0) >= 70) return 'busy'
  if (agent.activityState === 'collaborating' || agent.sceneState === 'handoff') return 'happy'
  if (agent.activityState === 'waiting_input') return 'focused'
  if (agent.sceneState === 'idle' || agent.activityState === 'cooldown') return 'sleepy'
  return agent.presence === 'active' ? 'focused' : 'happy'
}

function inferIntent(agent: {
  id: string
  presence: Presence
  activityState: ActivityState
  sceneState: OfficeSceneState
  percentUsed: number | null
  eventMatches: EventItem[]
  freshestAgeMs: number | null
  primaryTaskHint: WorkspaceAgent['primaryTaskHint']
}): { intent: AgentIntent; reason: string; interactionLabel: string } {
  const severeEvent = agent.eventMatches.find((event) => event.severity !== 'healthy')
  const hintId = agent.primaryTaskHint?.id
  if (agent.activityState === 'blocked' || agent.sceneState === 'blocked') {
    return { intent: 'alert', reason: 'Explicit blocked runtime state maps straight to the alert wall posture.', interactionLabel: 'triaging blocked run' }
  }
  if (agent.activityState === 'collaborating' || agent.sceneState === 'handoff' || hintId === 'meeting') {
    return { intent: 'meeting', reason: 'Explicit collaboration lineage or meeting metadata maps this character into the strategy table.', interactionLabel: 'syncing shared work' }
  }
  if (severeEvent?.severity === 'critical' || hintId === 'incident-response' || hintId === 'queue-triage') {
    return { intent: 'alert', reason: 'Incident and queue-triage hints pull the character to the alert wall without faking a full blocked state.', interactionLabel: 'watching hot signal' }
  }
  if (agent.activityState === 'executing' || hintId === 'monitoring' || hintId === 'coding' || hintId === 'research' || (agent.percentUsed ?? 0) >= 70 || agent.presence === 'active') {
    return { intent: 'monitor', reason: 'Explicit executing state or strong work signals keep the character anchored to a primary station.', interactionLabel: 'working station' }
  }
  if (agent.activityState === 'waiting_input' || hintId === 'drafting' || hintId === 'communications' || hintId === 'waiting-approval' || hintId === 'orchestration' || agent.presence === 'warm' || agent.presence === 'standby') {
    return { intent: 'desk', reason: 'Explicit waiting state keeps the character desk-side instead of aimlessly roaming.', interactionLabel: 'holding for next prompt' }
  }
  if (agent.activityState === 'cooldown' || (agent.freshestAgeMs != null && agent.freshestAgeMs > 6 * 60 * 60 * 1000)) {
    return { intent: 'break', reason: 'Cooldown maps to a coffee or lounge loop once active work quiets down.', interactionLabel: 'taking a coffee loop' }
  }
  return { intent: 'wander', reason: 'Sparse live evidence falls back to ambient office wandering.', interactionLabel: 'wandering hall' }
}

function sessionsForStation(meta: (typeof stationMeta)[number], data: OverviewResponse) {
  const normalizedSessions = (data.raw?.sessions?.sessions ?? []).filter((session) => (meta.sourceAgents as readonly string[]).includes(session.agentId))
  const activeSessions = (data.raw?.status?.sessions?.allActive ?? []).filter((session) => (meta.sourceAgents as readonly string[]).includes(session.agentId))
  const groupedSessions = (data.raw?.status?.sessions?.byAgent ?? [])
    .filter((group) => (meta.sourceAgents as readonly string[]).includes(group.agentId))
    .flatMap((group) => group.recent ?? [])

  const deduped = [...normalizedSessions, ...activeSessions, ...groupedSessions].reduce<RawSession[]>((items, session) => {
    if (!items.some((item) => item.key === session.key)) items.push(session)
    return items
  }, [])

  return deduped.sort((a, b) => (getAgeMs(a) ?? Number.MAX_SAFE_INTEGER) - (getAgeMs(b) ?? Number.MAX_SAFE_INTEGER))
}

function deriveWorkspace(data: OverviewResponse) {
  const collaborations = data.raw?.sessions?.collaborations ?? []

  const workspaceAgents: WorkspaceAgent[] = stationMeta.map((meta) => {
    const sessions = sessionsForStation(meta, data)

    const freshestSession = sessions[0] ?? null
    const topLevelMatch = data.agents.find((agent) => agent.name.toLowerCase() === meta.name.toLowerCase())
    const presence = inferPresence(freshestSession, sessions, data, [...meta.sourceAgents], Boolean(topLevelMatch), topLevelMatch?.state)
    const matchedEvents = data.events.filter((event) => eventAgentMatch(event) === meta.id).slice(0, 3)
    const matchedAttention = data.attention.filter((item) => attentionAgentMatch(item) === meta.id).slice(0, 2)
    const taskHints = deriveTaskHints(meta.id, freshestSession, matchedEvents, matchedAttention, topLevelMatch?.focus || meta.focus)
    const primaryTaskHint = taskHints[0] ?? null
    const kind = kindLabel(freshestSession)
    const ageMs = getAgeMs(freshestSession)
    const explicitSessionLabel = sessionLabel(freshestSession)
    const explicitTaskSummary = sessionTaskSummary(freshestSession, kind, ageMs, freshestSession?.model || topLevelMatch?.model)
    const activityState = freshestSession?.explicitActivityState ?? 'idle'
    const activityLabel = freshestSession?.explicitActivityLabel ?? (presence === 'preview' ? 'Preview' : 'Idle')
    const activityConfidence = freshestSession?.explicitActivityConfidence ?? (presence === 'preview' ? 'low' : 'medium')
    const activitySource = freshestSession?.explicitActivitySource ?? (data.auth ? 'Fallback workspace inference because no richer explicit session activity was available.' : 'Bundled preview snapshot.')
    const activitySummary = explicitTaskSummary
      || (freshestSession
        ? `${activityLabel} · ${kind} · ${freshestSession.model || topLevelMatch?.model || 'n/a'} · ${formatRelativeMs(ageMs)}${primaryTaskHint ? ` · ${primaryTaskHint.label}` : ''}`
        : data.auth
          ? 'No recent runtime session observed'
          : 'Preview character with bundled sample data')
    const workload = workloadProfile(freshestSession, presence)

    const baseAgent: WorkspaceAgent = {
      id: meta.id,
      name: meta.name,
      station: meta.station,
      stationTheme: meta.stationTheme,
      presence,
      activityState,
      activityLabel,
      activityConfidence,
      activitySource,
      stateLabel: stateLabelForPresence(presence),
      model: freshestSession?.model || topLevelMatch?.model || 'n/a',
      focus: topLevelMatch?.focus || meta.focus,
      note: freshestSession ? `Last active ${formatRelativeMs(ageMs)}` : topLevelMatch?.note || 'No recent sessions',
      avatarClass: topLevelMatch?.avatarClass || meta.avatarClass,
      initials: topLevelMatch?.initials || meta.initials,
      sourceAgents: [...meta.sourceAgents],
      freshestSession,
      freshestAgeMs: ageMs,
      tokens: freshestSession?.totalTokens ?? null,
      percentUsed: freshestSession?.percentUsed ?? null,
      kindLabel: kind,
      sessionLabel: explicitSessionLabel,
      taskSummary: explicitTaskSummary,
      taskSourceLabel: taskSourceLabel(freshestSession),
      activitySummary,
      eventMatches: matchedEvents,
      signalCount: sessions.length + matchedEvents.length + matchedAttention.length,
      truthLabel: '',
      workloadLabel: workload.label,
      workloadTone: workload.tone,
      observations: [],
      taskHints,
      primaryTaskHint,
      sceneState: 'idle',
      sceneLabel: 'Idle',
      sceneNote: '',
      mood: 'focused',
      intent: 'desk',
      liveReason: '',
      interactionLabel: explicitSessionLabel || explicitTaskSummary || activityLabel || 'checking in',
      collaborationPartner: null,
      collaborationNote: null,
    }

    baseAgent.truthLabel = truthLabelForAgent(baseAgent, data)
    return baseAgent
  })

  const explicitHandoffs = collaborations
    .map((link): WorkspaceHandoff | null => {
      const fromId = agentIdToWorkspaceId(link.fromAgentId)
      const toId = agentIdToWorkspaceId(link.toAgentId)
      const from = workspaceAgents.find((agent) => agent.id === fromId)
      const to = workspaceAgents.find((agent) => agent.id === toId)
      if (!from || !to || from.id === to.id) return null

      return {
        from: from.name,
        to: to.name,
        summary: link.sharedTask
          ? `${from.name} is linked to ${to.name} on “${link.sharedTask}”.`
          : `${from.name} is working with ${to.name}.`,
        gapLabel: collaborationGapLabel(link),
        confidenceLabel: collaborationConfidenceLabel(link),
        modeLabel: link.mode === 'delegation' ? 'delegation' : 'handoff',
        reason: link.reason,
        sharedTask: link.sharedTask ?? null,
        explicit: link.explicit,
      }
    })
    .filter((item): item is WorkspaceHandoff => Boolean(item))
    .slice(0, 3)

  const handoffs = explicitHandoffs.length > 0
    ? explicitHandoffs
    : (() => {
        const recentAgents = workspaceAgents
          .filter((agent) => agent.freshestAgeMs != null && agent.freshestAgeMs < 90 * 60 * 1000 && ['active', 'warm', 'standby'].includes(agent.presence))
          .sort((a, b) => (a.freshestAgeMs ?? Number.MAX_SAFE_INTEGER) - (b.freshestAgeMs ?? Number.MAX_SAFE_INTEGER))

        return recentAgents
          .slice(0, Math.max(0, recentAgents.length - 1))
          .map((current, index) => {
            const next = recentAgents[index + 1]
            if (!next || current.id === next.id) return null
            const currentAge = current.freshestAgeMs ?? 0
            const nextAge = next.freshestAgeMs ?? 0
            const gapMs = Math.abs(nextAge - currentAge)
            if (gapMs > 35 * 60 * 1000) return null

            return {
              from: next.name,
              to: current.name,
              summary: `${current.kindLabel} on ${current.model} followed ${next.kindLabel.toLowerCase()} activity on ${next.model}.`,
              gapLabel: `${Math.max(1, Math.round(gapMs / 60000))}m gap`,
              confidenceLabel: gapMs <= 12 * 60 * 1000 ? 'tight window' : 'plausible window',
              modeLabel: 'timing',
              reason: 'Inferred from closely clustered recent activity times.',
              sharedTask: current.taskSummary || next.taskSummary || null,
              explicit: false,
              gapMs,
            }
          })
          .filter(Boolean)
          .sort((a, b) => a!.gapMs - b!.gapMs)
          .slice(0, 1)
          .map((item) => {
            const { gapMs: _gapMs, ...handoff } = item!
            return handoff
          })
      })()

  const explicitHandoffIds = new Set(handoffs.filter((handoff) => handoff.explicit).flatMap((handoff) => [handoff.from.toLowerCase(), handoff.to.toLowerCase()]))
  const enrichedWorkspaceAgents = workspaceAgents.map((agent) => {
    const collaboration = handoffs.find((handoff) => handoff.from === agent.name || handoff.to === agent.name) ?? null
    const sessionCollaboration = agent.freshestSession?.collaboration
    const sceneState = inferSceneState(agent, explicitHandoffIds)
    const motionMap = inferIntent({
      id: agent.id,
      presence: agent.presence,
      activityState: agent.activityState,
      sceneState,
      percentUsed: agent.percentUsed,
      eventMatches: agent.eventMatches,
      freshestAgeMs: agent.freshestAgeMs,
      primaryTaskHint: agent.primaryTaskHint,
    })

    const collaborationPartner = collaboration
      ? (collaboration.from === agent.name ? collaboration.to : collaboration.from)
      : sessionCollaboration?.linkedAgentId
        ? prettyAgentName(agentIdToWorkspaceId(sessionCollaboration.linkedAgentId))
        : null
    const interactionLabel = agent.sessionLabel || agent.taskSummary || (collaboration?.sharedTask ? `working ${collaboration.sharedTask}` : motionMap.interactionLabel)

    const nextAgent: WorkspaceAgent = {
      ...agent,
      sceneState,
      sceneLabel: sceneLabelForState(sceneState),
      sceneNote: '',
      mood: 'focused',
      intent: motionMap.intent,
      liveReason: motionMap.reason,
      interactionLabel,
      collaborationPartner,
      collaborationNote: collaboration
        ? `${collaboration.modeLabel || 'linked'} · ${collaboration.reason}`
        : sessionCollaboration?.source
          ? `${sessionCollaboration.relation || 'linked'} · ${sessionCollaboration.source}`
          : null,
    }
    nextAgent.mood = inferMood(nextAgent)
    nextAgent.sceneNote = sceneNoteForAgent(nextAgent)
    nextAgent.observations = buildObservations(nextAgent, data)
    return nextAgent
  })

  return { workspaceAgents: enrichedWorkspaceAgents, handoffs }
}

function App() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    refetchInterval: 30000,
  })

  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: fetchAgentStatus,
    refetchInterval: 15000,
  })

  const isLive = Boolean(data?.auth)
  const { workspaceAgents, handoffs } = useMemo(() => (data ? deriveWorkspace(data) : { workspaceAgents: [], handoffs: [] }), [data])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('jarvis')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-300">Richard&apos;s Enterprise Dashboard</p>
            <h1 className="text-3xl font-semibold text-white">Jarvis Mission Control</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Operational cockpit for Jarvis and sub-agents: live room state up top, intervention queues below, and enough runtime context to make fast decisions without drowning in dashboard sludge.</p>
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
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {isLive ? (
              <button onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
                <Zap className="h-4 w-4" /> Preview snapshot mode
              </div>
            )}
          </div>
        </header>

        {error ? <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{(error as Error).message}</div> : null}

        {agentStatus && agentStatus.length > 0 ? (
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current agent work</span>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Live status from workspace/status</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {agentStatus.map((s) => (
                <div key={s.agent} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">{s.agent}</span>
                    {s.workspaceArea ? <span className="text-[10px] uppercase tracking-wide text-slate-500">{s.workspaceArea}</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{s.activity}</div>
                  {s.task ? <div className="mt-0.5 text-[11px] text-slate-500">{s.task}</div> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-8">
          <VirtualWorkspace
            agents={workspaceAgents}
            handoffs={handoffs}
            events={data?.events ?? []}
            isLive={isLive}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            formatRelativeMs={formatRelativeMs}
            healthClasses={healthClasses}
            presenceClasses={presenceClasses}
          />
        </section>

        {data?.llmOverview ? (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Models</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.llmOverview.activeModels.length > 0 ? (
                    data.llmOverview.activeModels.map((m) => (
                      <span key={m} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None active</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Token Volume (24h)</div>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <div className="text-xl font-semibold text-white">{(data.llmOverview.totalTokens24h / 1000).toFixed(1)}k</div>
                  <div className="flex flex-col items-end">
                    {Object.entries(data.llmOverview.providerBreakdown).map(([provider, value]) => (
                      <span key={provider} className="text-[9px] uppercase leading-tight text-slate-500">
                        {provider}: {(value / 1000).toFixed(1)}k
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Hottest Session</div>
                </div>
                {data.llmOverview.hottestSession ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="max-w-[120px] truncate text-sm font-medium text-white">{data.llmOverview.hottestSession.agentId}</span>
                      <span className="text-[10px] uppercase text-slate-500">{data.llmOverview.hottestSession.model}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">{(data.llmOverview.hottestSession.tokens / 1000).toFixed(1)}k tokens · ID: {data.llmOverview.hottestSession.id.slice(0, 8)}</div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No active sessions</div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Performance</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] uppercase text-slate-500">Latency</div>
                    <div className="text-sm font-medium text-white">{data.llmOverview.reliability?.avgLatencyMs ?? '—'}ms</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-500">Success</div>
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
                      {data.llmOverview.sessionStats.active} active <span className="mx-1 text-slate-600">/</span> {data.llmOverview.sessionStats.warm} warm
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

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <Panel title="Active agents" icon={<Bot className="h-4 w-4" />}>
              <div className="grid gap-3 lg:grid-cols-2">
                {(data?.agents ?? []).map((agent) => (
                  <div key={agent.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <AvatarCard avatarClass={agent.avatarClass} initials={agent.initials} name={agent.name} />
                        <div className="min-w-0">
                          <div className="font-medium text-white">{agent.name}</div>
                          <div className="truncate text-sm text-slate-400">{agent.focus}</div>
                          <div className="mt-1 text-xs text-slate-500">{agent.note}</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm text-cyan-300">{agent.state}</div>
                        <div className="text-xs text-slate-500">{agent.model}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-5">
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

          <div className="xl:col-span-4">
            <Panel title="Attention queue" icon={<AlertTriangle className="h-4 w-4" />}>
              <div className="space-y-3">
                {(data?.attention ?? []).length ? data?.attention.map((item) => <AttentionCard key={item.title} title={item.title} detail={item.detail} />) : <MutedBlock text="Nothing urgent is currently screaming for attention." />}
              </div>
            </Panel>
          </div>

          <div className="xl:col-span-4">
            <Panel title="Automation status" icon={<Clock3 className="h-4 w-4" />}>
              <ul className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-1">
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

          <div className="xl:col-span-4">
            <Panel title="Controls & safety" icon={<ShieldAlert className="h-4 w-4" />}>
              <div className="space-y-5">
                <div>
                  <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Ops posture</div>
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">Gateway</div>
                          <div className="mt-1 text-sm text-slate-200">{data?.raw?.gatewayStatus?.rpc?.ok ? 'Reachable on local loopback' : 'Needs attention'}</div>
                          <div className="mt-1 text-xs text-slate-500">{data?.raw?.gatewayStatus?.gateway?.probeUrl ?? 'Probe unavailable'}</div>
                        </div>
                        {isLive ? <ActionButton label="Restart gateway" onClick={restartGatewayAction} /> : null}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Session safety</div>
                      <div className="mt-1 text-sm text-slate-200">Tier 1 actions still require explicit confirmation.</div>
                      <div className="mt-1 text-xs text-slate-500">Exact commands should be preserved for approvals, not paraphrased.</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Control surface</div>
                      <div className="mt-1 text-sm text-slate-200">Mission Control reads local OpenClaw state through a thin adapter API.</div>
                      <div className="mt-1 text-xs text-slate-500">Good for monitoring and guided intervention; not a license for blind button-mashing.</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Access mode</div>
                  <ul className="space-y-3 text-sm text-slate-300">
                    {data?.auth ? (
                      <li className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div>
                          Access mode: <span className="font-medium text-emerald-300">{data.auth.via}</span>
                        </div>
                        {data.auth.publicOrigin ? <div className="mt-1 text-slate-400">Origin: {data.auth.publicOrigin}</div> : null}
                      </li>
                    ) : (
                      <li className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-100">
                        Preview snapshot only. Live runtime controls stay behind authenticated local access.
                      </li>
                    )}
                    <li className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">If something looks scary, verify the runtime first. A noisy UI is often a client problem, not a gateway disaster.</li>
                  </ul>
                </div>
              </div>
            </Panel>
          </div>

          <div className="md:col-span-2 xl:col-span-12">
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

function AvatarCard({ name, avatarClass, initials }: { name: string; avatarClass: string; initials: string }) {
  const accessory = {
    Jarvis: '✦',
    Elon: '🛠',
    Jensen: '🔎',
    Trinity: '✉',
  }[name] ?? '•'

  return (
    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-lg shadow-slate-950/40">
      <div className={`sim-creature sim-creature-panel bg-gradient-to-br ${avatarClass}`}>
        <div className="sim-creature-antenna" />
        <div className="sim-creature-head">
          <div className="sim-creature-face">
            <div className="sim-creature-eye sim-creature-eye-left" />
            <div className="sim-creature-eye sim-creature-eye-right" />
            <div className="sim-creature-mouth" />
          </div>
          <div className="sim-creature-accessory">{accessory}</div>
        </div>
        <div className="sim-creature-body-shell">
          <div className="sim-creature-belly">{initials}</div>
        </div>
        <div className="sim-creature-feet" />
      </div>
    </div>
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

function ActionButton({ label, onClick }: { label: string; onClick?: () => void | Promise<void> }) {
  return (
    <button
      onClick={() => void onClick?.()}
      className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-800"
    >
      {label}
    </button>
  )
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
    <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
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
