import type { EventItem, TaskHint, TaskHintId, WorkspaceAgent } from './types'

type SessionLike = {
  key: string
  kind?: string
  flags?: string[]
  thinkingLevel?: string
  percentUsed?: number | null
  systemSent?: boolean
  label?: string
  shortLabel?: string
  taskSummary?: string
  explicitActivityState?: string
  explicitActivityLabel?: string
  explicitActivitySource?: string
  collaboration?: {
    relation?: string
    sharedTask?: string | null
    source?: string
  } | null
} | null

type AttentionItem = {
  title: string
  detail: string
}

const taskHintLabels: Record<TaskHintId, string> = {
  coding: 'Coding',
  research: 'Research',
  drafting: 'Drafting',
  'waiting-approval': 'Waiting for approval',
  'incident-response': 'Incident response',
  meeting: 'Meeting',
  monitoring: 'Monitoring',
  communications: 'Communications',
  'queue-triage': 'Queue triage',
  orchestration: 'Orchestration',
}

const defaultHintsByAgent: Record<string, TaskHintId[]> = {
  jarvis: ['orchestration', 'monitoring'],
  elon: ['coding', 'monitoring'],
  jensen: ['research', 'monitoring'],
  trinity: ['communications', 'drafting'],
}

const keywordMatchers: Array<{ id: TaskHintId; score: number; pattern: RegExp }> = [
  { id: 'waiting-approval', score: 5, pattern: /\b(approval|approve|pending approval|auth scope|operator\.read)\b/i },
  { id: 'incident-response', score: 5, pattern: /\b(incident|critical|degraded|restart|restarting|recovery|timeout|failure|failed|error|unhealthy|outage|hot signal|alert)\b/i },
  { id: 'queue-triage', score: 4, pattern: /\b(queue|triage|backlog|pending|channel recovery|cron failures?)\b/i },
  { id: 'communications', score: 5, pattern: /\b(discord|channel|email|calendar|reminder|comms|communication|inbox)\b/i },
  { id: 'drafting', score: 4, pattern: /\b(draft|drafting|report|summary|brief|doc|document|talking points|copy)\b/i },
  { id: 'research', score: 5, pattern: /\b(research|analysis|findings|evidence|investigate|scan|fact)\b/i },
  { id: 'coding', score: 5, pattern: /\b(build|implementation|bug|deploy|debug|engineering|refactor|tooling|fix|ship|api|script)\b/i },
  { id: 'meeting', score: 4, pattern: /\b(meeting|sync|handoff|huddle|coordination)\b/i },
  { id: 'monitoring', score: 4, pattern: /\b(monitor|watch|health|status|heartbeat|scheduled run|cron)\b/i },
  { id: 'orchestration', score: 4, pattern: /\b(route|routing|orchestration|synthesis|verify|verification|command|top-level)\b/i },
]

function upsertScore(scores: Map<TaskHintId, { score: number; source: string }>, id: TaskHintId, score: number, source: string) {
  const current = scores.get(id)
  if (!current || score > current.score) {
    scores.set(id, { score, source })
    return
  }

  current.score += Math.max(1, Math.floor(score / 2))
}

function applyKeywordMatches(scores: Map<TaskHintId, { score: number; source: string }>, text: string, source: string) {
  if (!text.trim()) return
  for (const matcher of keywordMatchers) {
    if (matcher.pattern.test(text)) upsertScore(scores, matcher.id, matcher.score, source)
  }
}

export function deriveTaskHints(agentId: string, session: SessionLike, events: EventItem[], attention: AttentionItem[], focus: string): TaskHint[] {
  const scores = new Map<TaskHintId, { score: number; source: string }>()

  for (const [index, hintId] of (defaultHintsByAgent[agentId] ?? ['monitoring']).entries()) {
    upsertScore(scores, hintId, Math.max(1, 2 - index), 'role default')
  }

  const sessionKey = session?.key ?? ''
  const sessionText = [
    session?.kind,
    session?.label,
    session?.shortLabel,
    session?.taskSummary,
    session?.explicitActivityState,
    session?.explicitActivityLabel,
    session?.explicitActivitySource,
    session?.collaboration?.relation,
    session?.collaboration?.sharedTask,
    session?.collaboration?.source,
    sessionKey,
    session?.thinkingLevel,
    ...(session?.flags ?? []),
  ].filter(Boolean).join(' ')
  applyKeywordMatches(scores, sessionText, 'session metadata')

  if (sessionKey.includes(':cron:')) upsertScore(scores, 'monitoring', 6, 'session key')
  if (sessionKey.includes(':discord:channel:')) upsertScore(scores, 'communications', 6, 'session key')
  if (sessionKey.includes(':subagent:') && agentId === 'jarvis') upsertScore(scores, 'orchestration', 4, 'session key')
  if (session?.kind === 'group') upsertScore(scores, 'communications', 4, 'session kind')
  if (session?.systemSent) upsertScore(scores, 'monitoring', 2, 'system session')
  if ((session?.percentUsed ?? 0) >= 60) upsertScore(scores, 'monitoring', 2, 'runtime load')

  for (const event of events) {
    const eventText = `${event.title} ${event.detail}`
    applyKeywordMatches(scores, eventText, 'runtime event')
    if (event.severity === 'critical') upsertScore(scores, 'incident-response', 6, 'critical event')
    if (event.severity === 'warning') upsertScore(scores, 'monitoring', 2, 'warning event')
  }

  for (const item of attention) {
    applyKeywordMatches(scores, `${item.title} ${item.detail}`, 'attention item')
  }

  applyKeywordMatches(scores, focus, 'station focus')

  return [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([id, meta]) => ({
      id,
      label: taskHintLabels[id],
      confidence: meta.score >= 9 ? 'high' : meta.score >= 5 ? 'medium' : 'low',
      source: meta.source,
    }))
}

export function pickActivityEmoji(agent: Pick<WorkspaceAgent, 'activityState' | 'sceneState' | 'primaryTaskHint'>) {
  const hintId = agent.primaryTaskHint?.id

  if (agent.activityState === 'collaborating') return '🤝'
  if (agent.activityState === 'waiting_input') return '⏳'
  if (agent.activityState === 'cooldown') return '☕️'

  if (agent.sceneState === 'blocked') return '🚨'

  if (hintId === 'coding') return '💻'
  if (hintId === 'research') return '🔍'
  if (hintId === 'communications' || hintId === 'drafting') return '✏️'
  if (hintId === 'incident-response') return '🚨'
  if (hintId === 'queue-triage') return '📊'
  if (hintId === 'monitoring') return '📺'

  return null
}

export function attentionAgentMatch(item: AttentionItem) {
  const text = `${item.title} ${item.detail}`.toLowerCase()
  if (text.includes('discord') || text.includes('channel') || text.includes('comms') || text.includes('email') || text.includes('calendar')) return 'trinity'
  if (text.includes('research') || text.includes('analysis') || text.includes('fact') || text.includes('evidence')) return 'jensen'
  if (text.includes('deploy') || text.includes('build') || text.includes('bug') || text.includes('implementation') || text.includes('tooling')) return 'elon'
  return 'jarvis'
}
