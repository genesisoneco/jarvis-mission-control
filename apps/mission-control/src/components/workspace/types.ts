export type Health = 'healthy' | 'warning' | 'critical'
export type Presence = 'active' | 'warm' | 'standby' | 'idle' | 'blocked' | 'preview'
export type ActivityState = 'executing' | 'waiting_input' | 'collaborating' | 'blocked' | 'cooldown' | 'idle'
export type OfficeSceneState = 'active' | 'handoff' | 'waiting' | 'idle' | 'blocked' | 'preview'
export type AgentMood = 'focused' | 'happy' | 'alert' | 'busy' | 'sleepy' | 'blocked'
export type AgentIntent = 'desk' | 'monitor' | 'meeting' | 'alert' | 'break' | 'wander'
export type TaskHintId = 'coding' | 'research' | 'drafting' | 'waiting-approval' | 'incident-response' | 'meeting' | 'monitoring' | 'communications' | 'queue-triage' | 'orchestration'
export type TaskHintConfidence = 'high' | 'medium' | 'low'

export type TaskHint = {
  id: TaskHintId
  label: string
  confidence: TaskHintConfidence
  source: string
}

export type EventItem = {
  time: string
  severity: Health
  title: string
  detail: string
  scope?: 'ambient' | 'agent'
}

export type WorkspaceHandoff = {
  from: string
  to: string
  summary: string
  gapLabel: string
  confidenceLabel: string
  modeLabel?: string
  reason?: string
  sharedTask?: string | null
  explicit?: boolean
}

export type WorkspaceAgent = {
  id: string
  name: string
  station: string
  stationTheme: string
  presence: Presence
  activityState: ActivityState
  activityLabel: string
  activityConfidence: 'high' | 'medium' | 'low'
  activitySource: string
  stateLabel: string
  model: string
  focus: string
  note: string
  avatarClass: string
  initials: string
  sourceAgents: string[]
  freshestSession: {
    key: string
    thinkingLevel?: string
    label?: string
    shortLabel?: string
    taskSummary?: string
    taskSummarySource?: string
    spawnedBy?: string
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
  } | null
  freshestAgeMs: number | null
  tokens: number | null
  percentUsed: number | null
  kindLabel: string
  sessionLabel: string | null
  taskSummary: string | null
  taskSourceLabel: string | null
  activitySummary: string
  eventMatches: EventItem[]
  signalCount: number
  truthLabel: string
  workloadLabel: string
  workloadTone: Health
  observations: string[]
  taskHints: TaskHint[]
  primaryTaskHint: TaskHint | null
  sceneState: OfficeSceneState
  sceneLabel: string
  sceneNote: string
  mood: AgentMood
  intent: AgentIntent
  liveReason: string
  interactionLabel: string
  collaborationPartner: string | null
  collaborationNote: string | null
}
