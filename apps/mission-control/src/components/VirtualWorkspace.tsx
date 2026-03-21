import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Activity, AlertTriangle, Coffee, Cpu, Maximize2, Minimize2, Radio, Sparkles } from 'lucide-react'
import { buildWaypointPath, homeZoneByAgent, intentZone, nearestWaypoint, pointDistance, prioritizedPropsForAgent, waypointPositions, zoneById, zoneDefinitions, type Point, type ZoneId } from './workspace/scene'
import type { EventItem, Health, Presence, WorkspaceAgent, WorkspaceHandoff } from './workspace/types'

type Props = {
  agents: WorkspaceAgent[]
  handoffs: WorkspaceHandoff[]
  events: EventItem[]
  isLive: boolean
  selectedAgentId?: string
  onSelectAgent: (agentId: string) => void
  formatRelativeMs: (ageMs: number | null | undefined) => string
  healthClasses: Record<Health, string>
  presenceClasses: Record<Presence, string>
}

type AgentMotionState = {
  position: Point
  route: Point[]
  facing: 'left' | 'right'
  targetZone: ZoneId
  targetPropId?: string
  targetPropType?: string
  action: string
  finalAction: string
  seatIndex: number
  holdUntilBeat: number
  isMoving: boolean
}

type CreaturePose = 'desk' | 'monitor' | 'meeting' | 'alert' | 'break' | 'wander' | 'waiting' | 'presenting'

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  msFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
  msExitFullscreen?: () => Promise<void> | void
}

type FullscreenHTMLElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

const spreadOffsets: Point[] = [
  { x: 0, y: 0 },
  { x: -4.5, y: -1.6 },
  { x: 4.5, y: -1.6 },
  { x: -5.5, y: 2.8 },
  { x: 5.5, y: 2.8 },
  { x: -8, y: 0.8 },
  { x: 8, y: 0.8 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function dedupeZones(zones: ZoneId[]) {
  return zones.filter((zoneId, index, items) => items.indexOf(zoneId) === index)
}

function agentSeed(agentId: string) {
  return agentId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function contextualZoneCycle(agent: WorkspaceAgent) {
  const homeZone = homeZoneByAgent[agent.id] ?? 'meeting-area'
  const primaryZone = intentZone(agent.intent, agent.id)
  const hintId = agent.primaryTaskHint?.id

  const extras: ZoneId[] = (() => {
    if (agent.activityState === 'blocked' || agent.sceneState === 'blocked') return ['alert-wall', 'engineering-bay', 'command-desk']
    if (agent.activityState === 'collaborating' || agent.sceneState === 'handoff') return ['meeting-area', homeZone, 'command-desk']
    if (agent.activityState === 'waiting_input') return [homeZone, 'meeting-area', 'break-area', 'command-desk']
    if (agent.activityState === 'cooldown') return ['break-area', homeZone, 'meeting-area']
    if (hintId === 'incident-response' || hintId === 'queue-triage' || hintId === 'monitoring') return ['alert-wall', 'meeting-area', homeZone, 'break-area']
    if (hintId === 'coding') return ['engineering-bay', 'meeting-area', 'alert-wall', 'break-area']
    if (hintId === 'research') return ['research-corner', 'meeting-area', 'break-area', 'command-desk']
    if (hintId === 'communications' || hintId === 'drafting') return ['comms-desk', 'meeting-area', 'break-area', 'command-desk']
    if (hintId === 'waiting-approval' || hintId === 'orchestration') return ['command-desk', 'meeting-area', 'alert-wall', 'break-area']
    if (agent.sceneState === 'waiting') return [homeZone, 'meeting-area', 'break-area', 'alert-wall']
    if (agent.sceneState === 'idle') return ['break-area', 'meeting-area', homeZone]
    return [primaryZone, homeZone, 'meeting-area', 'break-area']
  })()

  return dedupeZones([primaryZone, homeZone, ...extras])
}

function chooseNextStop(agent: WorkspaceAgent, beat: number, index: number) {
  const cycle = contextualZoneCycle(agent)
  const homeZone = homeZoneByAgent[agent.id] ?? cycle[0] ?? 'meeting-area'
  const primaryZone = intentZone(agent.intent, agent.id)
  const seed = agentSeed(agent.id) + index * 5
  const rhythm = (beat + seed) % 12

  if (agent.activityState === 'blocked' || agent.sceneState === 'blocked') return { zoneId: 'alert-wall' as ZoneId, dwellBeats: 2 }
  if (agent.activityState === 'collaborating' || agent.sceneState === 'handoff') return { zoneId: 'meeting-area' as ZoneId, dwellBeats: 4 }
  if (agent.activityState === 'waiting_input') {
    if (rhythm < 8) return { zoneId: homeZone, dwellBeats: 4 }
    return { zoneId: cycle[1] ?? 'meeting-area', dwellBeats: 2 }
  }
  if (agent.activityState === 'cooldown') {
    if (rhythm < 7) return { zoneId: 'break-area' as ZoneId, dwellBeats: 4 }
    return { zoneId: homeZone, dwellBeats: 2 }
  }

  if (agent.sceneState === 'active') {
    if (rhythm < 6) return { zoneId: primaryZone, dwellBeats: 3 }
    if (rhythm < 8) return { zoneId: cycle[1] ?? homeZone, dwellBeats: 2 }
    if (rhythm < 10) return { zoneId: cycle[2] ?? homeZone, dwellBeats: 2 }
    return { zoneId: homeZone, dwellBeats: 3 }
  }

  if (agent.sceneState === 'waiting') {
    if (rhythm < 4) return { zoneId: homeZone, dwellBeats: 3 }
    if (rhythm < 7) return { zoneId: cycle[1] ?? 'meeting-area', dwellBeats: 2 }
    if (rhythm < 10) return { zoneId: cycle[2] ?? 'break-area', dwellBeats: 2 }
    return { zoneId: primaryZone, dwellBeats: 2 }
  }

  if (agent.sceneState === 'idle') {
    if (rhythm < 4) return { zoneId: cycle[0] ?? 'break-area', dwellBeats: 3 }
    if (rhythm < 8) return { zoneId: cycle[1] ?? homeZone, dwellBeats: 2 }
    return { zoneId: homeZone, dwellBeats: 2 }
  }

  return { zoneId: primaryZone, dwellBeats: 3 }
}

function actionForZone(zoneId: ZoneId, agent: WorkspaceAgent, propType?: string) {
  const hintId = agent.primaryTaskHint?.id
  if (zoneId === 'meeting-area') return agent.activityState === 'collaborating' || agent.sceneState === 'handoff' ? 'shared task huddle' : hintId === 'meeting' ? 'strategy sync' : 'table sync'
  if (zoneId === 'break-area') return propType === 'coffee' || agent.presence === 'idle' || agent.activityState === 'cooldown' ? 'coffee reset' : 'cooldown loop'
  if (zoneId === 'alert-wall') {
    if (agent.activityState === 'blocked') return propType === 'server' ? 'recovering blocked run' : 'triaging blocked run'
    if (hintId === 'incident-response') return propType === 'server' ? 'stabilizing service rack' : 'handling recovery incident'
    if (hintId === 'queue-triage') return 'triaging live queue'
    return propType === 'server' ? 'checking rack status' : 'triaging alert wall'
  }

  if (agent.activityState === 'waiting_input' && propType === 'whiteboard') return 'holding next step on whiteboard'
  if (agent.activityState === 'waiting_input' && propType === 'coffee') return 'waiting with coffee'
  if (hintId === 'waiting-approval' && zoneId === 'command-desk') return 'reviewing approval queue'
  if (hintId === 'communications' && zoneId === 'comms-desk') return 'drafting reply'
  if (hintId === 'drafting' && propType === 'whiteboard') return 'drafting outline'
  if (hintId === 'research' && zoneId === 'research-corner') return propType === 'shelf' ? 'checking references' : 'reviewing findings'
  if (hintId === 'coding' && zoneId === 'engineering-bay') return propType === 'server' ? 'checking build runtime' : 'shipping fix'
  if (hintId === 'orchestration' && zoneId === 'command-desk') return 'routing next move'

  if (propType === 'whiteboard') {
    return {
      jarvis: 'plotting route notes',
      elon: 'mapping build fixes',
      jensen: 'pinning findings',
      trinity: 'drafting talking points',
    }[agent.id] ?? 'reviewing whiteboard'
  }

  if (propType === 'cabinet' || propType === 'shelf') {
    return {
      jarvis: 'pulling runbook',
      elon: 'grabbing toolkit',
      jensen: 'checking references',
      trinity: 'sorting materials',
    }[agent.id] ?? 'checking supplies'
  }

  if (propType === 'server') return 'checking rack status'
  if (propType === 'coffee') return 'coffee reset'
  if (propType === 'monitor' || propType === 'display') return agent.activityState === 'executing' ? 'executing at monitor' : 'watching display'

  return {
    jarvis: 'working command desk',
    elon: 'using build station',
    jensen: 'reviewing research board',
    trinity: 'working comms desk',
  }[agent.id] ?? agent.interactionLabel
}

function poseForMotion(zoneId: ZoneId, action: string, isMoving = false, activityState?: WorkspaceAgent['activityState']): CreaturePose {
  if (isMoving) return 'wander'
  if (activityState === 'waiting_input') return 'waiting'
  if (activityState === 'collaborating') return 'presenting'
  if (zoneId === 'meeting-area') return 'meeting'
  if (zoneId === 'break-area') return 'break'
  if (zoneId === 'alert-wall') return 'alert'
  if (action.includes('monitor') || action.includes('reviewing') || action.includes('triaging') || action.includes('checking') || action.includes('executing')) return 'monitor'
  if (action.includes('desk') || action.includes('station') || action.includes('drafting') || action.includes('routing') || action.includes('holding')) return 'desk'
  return 'wander'
}

function placementForZone(zoneId: ZoneId) {
  return {
    'command-desk': { scale: 0.86, lift: 1.8 },
    'engineering-bay': { scale: 0.88, lift: 1.8 },
    'research-corner': { scale: 0.84, lift: 1.6 },
    'comms-desk': { scale: 0.84, lift: 1.6 },
    'meeting-area': { scale: 0.9, lift: 0.8 },
    'alert-wall': { scale: 0.82, lift: 0.4 },
    'break-area': { scale: 0.8, lift: 0.4 },
  }[zoneId]
}

function facingForZone(zoneId: ZoneId, position: Point): 'left' | 'right' {
  if (zoneId === 'meeting-area') return position.x < 50 ? 'right' : 'left'
  if (zoneId === 'alert-wall') return position.x < 50 ? 'right' : 'left'
  if (zoneId === 'engineering-bay' || zoneId === 'comms-desk') return 'left'
  return 'right'
}

function creaturePalette(agentId: string) {
  return {
    jarvis: {
      '--creature-body': 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 48%, #0891b2 100%)',
      '--creature-trim': '#dffbff',
      '--creature-shadow': 'rgba(8, 145, 178, 0.42)',
      '--creature-accent': '#0f172a',
      '--creature-belly': '#ecfeff',
    },
    elon: {
      '--creature-body': 'linear-gradient(180deg, #fdba74 0%, #fb923c 50%, #ea580c 100%)',
      '--creature-trim': '#fff1df',
      '--creature-shadow': 'rgba(194, 65, 12, 0.45)',
      '--creature-accent': '#1c1917',
      '--creature-belly': '#fff7ed',
    },
    jensen: {
      '--creature-body': 'linear-gradient(180deg, #6ee7b7 0%, #34d399 46%, #059669 100%)',
      '--creature-trim': '#dcfce7',
      '--creature-shadow': 'rgba(5, 150, 105, 0.42)',
      '--creature-accent': '#052e16',
      '--creature-belly': '#ecfdf5',
    },
    trinity: {
      '--creature-body': 'linear-gradient(180deg, #f9a8d4 0%, #f472b6 48%, #db2777 100%)',
      '--creature-trim': '#ffe4f1',
      '--creature-shadow': 'rgba(190, 24, 93, 0.42)',
      '--creature-accent': '#500724',
      '--creature-belly': '#fdf2f8',
    },
  }[agentId] ?? {
    '--creature-body': 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 52%, #475569 100%)',
    '--creature-trim': '#f8fafc',
    '--creature-shadow': 'rgba(15, 23, 42, 0.42)',
    '--creature-accent': '#020617',
    '--creature-belly': '#f8fafc',
  }
}

function createRoute(start: Point, zoneId: ZoneId, agent: WorkspaceAgent, seatIndex: number) {
  const zone = zoneById(zoneId)
  const startWaypoint = nearestWaypoint(start)
  const pathNodes = buildWaypointPath(startWaypoint, zone.entrance)
  const hallwayRoute = pathNodes.map((node) => waypointPositions[node])
  const offset = spreadOffsets[seatIndex % spreadOffsets.length] ?? spreadOffsets[0]
  const prioritizedProps = prioritizedPropsForAgent(zoneId, agent)
  const anchorProp = prioritizedProps[seatIndex % Math.max(1, prioritizedProps.length)] ?? prioritizedProps[0] ?? zone.props[0]

  let destination = zone.anchor
  let action = actionForZone(zoneId, agent, anchorProp?.type)

  if (zoneId === 'meeting-area' && zone.seats?.length) {
    const seat = zone.seats[seatIndex % zone.seats.length]
    destination = { x: seat.x + offset.x * 0.25, y: seat.y + offset.y * 0.25 }
  } else if (zoneId === 'break-area' && zone.seats?.length) {
    const seat = zone.seats[seatIndex % zone.seats.length]
    destination = { x: seat.x + offset.x * 0.22, y: seat.y + offset.y * 0.12 }
    action = actionForZone(zoneId, agent, seatIndex % 2 === 0 ? 'coffee' : anchorProp?.type)
  } else if (zoneId === 'alert-wall') {
    const targetX = anchorProp?.x != null ? anchorProp.x + (anchorProp.w ?? 4) / 2 : 50
    destination = { x: clamp(targetX + offset.x * 0.16, 42, 58), y: 22.6 + offset.y * 0.16 }
  } else if (anchorProp) {
    const centerX = anchorProp.x + (anchorProp.w ?? 4) / 2
    const baseY = anchorProp.y + (anchorProp.h ?? 4)
    const standingDepth = anchorProp.type === 'monitor' || anchorProp.type === 'display' || anchorProp.type === 'whiteboard' ? 3.1 : anchorProp.type === 'coffee' ? 2 : 2.6
    const lateralSpread = anchorProp.type === 'whiteboard' ? 0.06 : 0.14
    destination = {
      x: clamp(centerX + offset.x * lateralSpread, zone.position.x + 4.2, zone.position.x + zone.position.w - 4.2),
      y: clamp(baseY + standingDepth + offset.y * 0.08, zone.position.y + 4.2, zone.position.y + zone.position.h - 3.3),
    }
  }

  const route = [...hallwayRoute, destination].filter((point, index, array) => index === 0 || pointDistance(point, array[index - 1]) > 1)
  return { route, action, targetPropId: anchorProp?.id, targetPropType: anchorProp?.type }
}

function stepToward(current: Point, target: Point, speed: number) {
  const dx = target.x - current.x
  const dy = target.y - current.y
  const distance = Math.hypot(dx, dy)
  if (distance <= speed) return target
  return { x: current.x + (dx / distance) * speed, y: current.y + (dy / distance) * speed }
}

function characterMoodClass(mood: WorkspaceAgent['mood']) {
  return {
    focused: 'is-focused',
    happy: 'is-happy',
    alert: 'is-alert',
    busy: 'is-busy',
    sleepy: 'is-sleepy',
    blocked: 'is-blocked',
  }[mood]
}

function sceneStatusTone(state: WorkspaceAgent['sceneState']) {
  return {
    active: 'is-active',
    handoff: 'is-handoff',
    waiting: 'is-waiting',
    idle: 'is-idle',
    blocked: 'is-blocked',
    preview: 'is-preview',
  }[state]
}

function collaborationLineLabel(handoff: WorkspaceHandoff) {
  if (handoff.sharedTask) return `Shared work: ${handoff.sharedTask}`
  if (handoff.modeLabel === 'delegation') return 'Delegated work link'
  if (handoff.modeLabel === 'handoff') return 'Active handoff link'
  return 'Linked work'
}

function roleAccessory(agentId: string) {
  return {
    jarvis: '✦',
    elon: '🛠',
    jensen: '🔎',
    trinity: '✉',
  }[agentId] ?? '•'
}

function renderCreature(agent: WorkspaceAgent, pose: CreaturePose, directionClass = 'sim-agent-facing-right', panel = false) {
  return (
    <div
      className={`sim-creature ${panel ? 'sim-creature-panel' : ''} ${directionClass} ${characterMoodClass(agent.mood)} pose-${pose}`}
      style={creaturePalette(agent.id) as CSSProperties}
    >
      <div className="sim-creature-floor-shadow" />
      <div className="sim-creature-shadow" />
      <div className="sim-creature-tail" />
      <div className="sim-creature-body-shell">
        <div className="sim-creature-ear sim-creature-ear-left" />
        <div className="sim-creature-ear sim-creature-ear-right" />
        <div className="sim-creature-highlight" />
        <div className="sim-creature-arm sim-creature-arm-left" />
        <div className="sim-creature-arm sim-creature-arm-right" />
        <div className="sim-creature-face">
          <div className="sim-creature-eye sim-creature-eye-left" />
          <div className="sim-creature-eye sim-creature-eye-right" />
          <div className="sim-creature-blush sim-creature-blush-left" />
          <div className="sim-creature-blush sim-creature-blush-right" />
          <div className="sim-creature-mouth" />
        </div>
        <div className="sim-creature-belly">{agent.initials}</div>
        <div className="sim-creature-feet">
          <span className="sim-creature-foot sim-creature-foot-left" />
          <span className="sim-creature-foot sim-creature-foot-right" />
        </div>
      </div>
      <div className="sim-creature-accessory">{roleAccessory(agent.id)}</div>
    </div>
  )
}

export default function VirtualWorkspace({ agents, handoffs, events, isLive, selectedAgentId, onSelectAgent, formatRelativeMs, healthClasses, presenceClasses }: Props) {
  const [beat, setBeat] = useState(0)
  const [motion, setMotion] = useState<Record<string, AgentMotionState>>({})
  const [isFallbackFocused, setIsFallbackFocused] = useState(false)
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false)
  const motionRef = useRef<Record<string, AgentMotionState>>({})
  const workspaceShellRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setBeat((value) => value + 1), 3200)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const syncFullscreenState = () => {
      const fullscreenDocument = document as FullscreenDocument
      const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? fullscreenDocument.msFullscreenElement ?? null
      setIsBrowserFullscreen(fullscreenElement === workspaceShellRef.current)
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState as EventListener)
    document.addEventListener('msfullscreenchange', syncFullscreenState as EventListener)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState as EventListener)
      document.removeEventListener('msfullscreenchange', syncFullscreenState as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!isFallbackFocused) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFallbackFocused(false)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [isFallbackFocused])

  const handleWorkspaceFocusToggle = async () => {
    const shell = workspaceShellRef.current as FullscreenHTMLElement | null
    const fullscreenDocument = document as FullscreenDocument
    const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? fullscreenDocument.msFullscreenElement ?? null

    if (fullscreenElement === shell) {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        return
      }
      if (fullscreenDocument.webkitExitFullscreen) {
        await fullscreenDocument.webkitExitFullscreen()
        return
      }
      if (fullscreenDocument.msExitFullscreen) {
        await fullscreenDocument.msExitFullscreen()
        return
      }
      setIsFallbackFocused(false)
      return
    }

    if (isFallbackFocused) {
      setIsFallbackFocused(false)
      return
    }

    if (!shell) return

    try {
      if (shell.requestFullscreen) {
        await shell.requestFullscreen()
        return
      }
      if (shell.webkitRequestFullscreen) {
        await shell.webkitRequestFullscreen()
        return
      }
      if (shell.msRequestFullscreen) {
        await shell.msRequestFullscreen()
        return
      }
    } catch {
      setIsFallbackFocused(true)
      return
    }

    setIsFallbackFocused(true)
  }

  const isWorkspaceFocused = isBrowserFullscreen || isFallbackFocused
  const visibleHandoffs = useMemo(() => handoffs.filter((handoff) => handoff.explicit).slice(0, 4), [handoffs])
  const handoffSet = useMemo(() => new Set(handoffs.flatMap((handoff) => [handoff.from.toLowerCase(), handoff.to.toLowerCase()])), [handoffs])
  const roomStateClass = useMemo(() => {
    if (agents.some((agent) => agent.activityState === 'blocked')) return 'room-alert'
    if (agents.some((agent) => agent.activityState === 'collaborating')) return 'room-collab'
    if (agents.some((agent) => agent.activityState === 'executing')) return 'room-busy'
    if (agents.every((agent) => agent.activityState === 'cooldown' || agent.activityState === 'idle')) return 'room-calm'
    return 'room-neutral'
  }, [agents])
  const activePropIds = useMemo(() => new Set(Object.values(motion).map((state) => state?.targetPropId).filter(Boolean)), [motion])

  useEffect(() => {
    if (agents.length === 0) return

    const baseState = { ...motionRef.current }
    agents.forEach((agent, index) => {
      if (!baseState[agent.id]) {
        const homeZone = zoneById(homeZoneByAgent[agent.id] ?? 'meeting-area')
        baseState[agent.id] = {
          position: homeZone.anchor,
          route: [homeZone.anchor],
          facing: 'right',
          targetZone: homeZone.id,
          action: 'arriving',
          finalAction: 'settling in',
          targetPropId: undefined,
          targetPropType: undefined,
          seatIndex: index,
          holdUntilBeat: beat + 1,
          isMoving: true,
        }
      }
    })

    agents.forEach((agent, index) => {
      const current = baseState[agent.id]
      const forcedZone: ZoneId | null = agent.sceneState === 'blocked' ? 'alert-wall' : agent.sceneState === 'handoff' ? 'meeting-area' : null
      const shouldInterrupt = Boolean(forcedZone && current.targetZone !== forcedZone)
      const shouldPlan = shouldInterrupt || (current.route.length === 0 && beat >= current.holdUntilBeat)
      if (!shouldPlan) return

      const nextStop = forcedZone ? { zoneId: forcedZone, dwellBeats: agent.sceneState === 'blocked' ? 2 : 3 } : chooseNextStop(agent, beat, index)
      const seatIndex = handoffSet.has(agent.name.toLowerCase())
        ? agents.findIndex((item) => handoffSet.has(item.name.toLowerCase()) && item.id === agent.id)
        : index + beat + agentSeed(agent.id)
      const planned = createRoute(current.position, nextStop.zoneId, agent, Math.max(0, seatIndex))

      current.targetZone = nextStop.zoneId
      current.route = planned.route
      current.targetPropId = planned.targetPropId
      current.targetPropType = planned.targetPropType
      current.action = planned.route.length > 0 ? `walking to ${zoneById(nextStop.zoneId).label.toLowerCase()}` : planned.action
      current.finalAction = planned.action
      current.seatIndex = Math.max(0, seatIndex)
      current.holdUntilBeat = beat + nextStop.dwellBeats
      current.isMoving = planned.route.length > 0
    })

    motionRef.current = baseState
    setMotion(baseState)

    let frame = 0
    const animate = () => {
      const nextState: Record<string, AgentMotionState> = { ...motionRef.current }

      agents.forEach((agent) => {
        const current = nextState[agent.id]
        if (!current) return
        if (current.route.length === 0) {
          current.isMoving = false
          current.facing = facingForZone(current.targetZone, current.position)
          return
        }

        const [target, ...rest] = current.route
        const speed = agent.sceneState === 'blocked' ? 0.42 : agent.sceneState === 'active' ? 0.34 : agent.sceneState === 'handoff' ? 0.3 : agent.sceneState === 'waiting' ? 0.24 : 0.18
        const stepped = stepToward(current.position, target, speed)
        current.isMoving = pointDistance(stepped, current.position) >= 0.01
        if (current.isMoving) current.action = `walking to ${zoneById(current.targetZone).label.toLowerCase()}`
        current.facing = current.isMoving ? (stepped.x >= current.position.x ? 'right' : 'left') : facingForZone(current.targetZone, current.position)
        current.position = stepped
        if (pointDistance(stepped, target) < 0.5) {
          current.route = rest
          if (rest.length === 0) {
            current.isMoving = false
            current.action = current.finalAction
            current.facing = facingForZone(current.targetZone, stepped)
          }
        }
      })

      motionRef.current = nextState
      setMotion({ ...nextState })
      frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [agents, beat, handoffSet])

  const selected = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0]
  const selectedMotion = selected ? motion[selected.id] : null
  const activeCount = agents.filter((agent) => (['active', 'warm', 'blocked'] as Presence[]).includes(agent.presence)).length

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/70 p-3 shadow-[0_30px_120px_rgba(2,6,23,0.55)] lg:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> Hero workspace
            </div>
            <div className="text-xl font-semibold text-white lg:text-2xl">Front-of-screen virtual office</div>
            <div className="mt-2 max-w-3xl text-sm text-slate-400">The room leads now: a wide office scene sits directly under the header, with live agent behavior and support panels flowing underneath instead of competing above the fold.</div>
          </div>
          <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3 lg:min-w-[360px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Live signals</div>
              <div className="mt-1 text-lg font-semibold text-white">{activeCount}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Handoff windows</div>
              <div className="mt-1 text-lg font-semibold text-white">{handoffs.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Truth mode</div>
              <div className="mt-1 text-sm font-medium text-cyan-300">{isLive ? 'Runtime-derived' : 'Preview snapshot'}</div>
            </div>
          </div>
        </div>

        <div ref={workspaceShellRef} className={`office-sim-shell ${isWorkspaceFocused ? 'is-focused' : ''} ${isBrowserFullscreen ? 'is-native-fullscreen' : ''}`}>
          <div className={`office-sim relative overflow-hidden rounded-[2rem] border border-slate-700/70 bg-slate-900/60 ${roomStateClass}`}>
            <div className="office-sim-stars" />
            <div className="office-sim-lights" />
            <div className="office-sim-wall office-sim-wall-top" />
            <div className="office-sim-wall office-sim-wall-left" />
            <div className="office-sim-wall office-sim-wall-right" />
            <div className="office-sim-window office-sim-window-left" />
            <div className="office-sim-window office-sim-window-right" />
            <div className="office-sim-floor" />
            <div className="office-sim-floor-glow" />
            <div className="office-sim-rug office-sim-rug-center" />
            <div className="office-sim-rug office-sim-rug-bottom" />
            <div className="office-sim-walkway office-sim-walkway-x" />
            <div className="office-sim-walkway office-sim-walkway-y" />
            <div className="office-sim-waypoint office-sim-waypoint-north" />
            <div className="office-sim-waypoint office-sim-waypoint-south" />
            <div className="office-sim-waypoint office-sim-waypoint-west" />
            <div className="office-sim-waypoint office-sim-waypoint-east" />
            <div className="office-sim-ceiling-lamp office-sim-ceiling-lamp-left" />
            <div className="office-sim-ceiling-lamp office-sim-ceiling-lamp-center" />
            <div className="office-sim-ceiling-lamp office-sim-ceiling-lamp-right" />

            <div className="office-sim-headerbar">
              <div className="space-y-2">
                <div className="office-sim-headerchip">Mission office live scene</div>
                <div className="office-sim-linknote">
                  {visibleHandoffs.length > 0
                    ? 'Dotted blue links only appear for explicit collaboration or handoff relationships.'
                    : 'No explicit collaboration link is active right now, so the scene stays clean.'}
                </div>
              </div>
              <div className="inline-flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-500">
                <span className="office-sim-statpill">{isLive ? 'Live feed' : 'Preview feed'}</span>
                <span className="office-sim-statpill">{agents.reduce((sum, agent) => sum + agent.signalCount, 0)} markers</span>
                <span className="office-sim-statpill">{visibleHandoffs.length > 0 ? `${visibleHandoffs.length} linked` : 'No live links'}</span>
                {isWorkspaceFocused ? <span className="office-sim-statpill">Esc to exit focus</span> : null}
              </div>
            </div>

            <div className="office-zones">
              {zoneDefinitions.map((zone) => {
                const Icon = zone.icon
                return (
                  <div
                    key={zone.id}
                    className={`office-zone bg-gradient-to-br ${zone.accentClass}`}
                    style={{ left: `${zone.position.x}%`, top: `${zone.position.y}%`, width: `${zone.position.w}%`, height: `${zone.position.h}%` }}
                  >
                    <div className="office-zone-label">
                      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        <Icon className="h-3 w-3" /> {zone.label}
                      </div>
                    </div>
                    {zone.props.map((prop) => (
                      <div
                        key={prop.id}
                        className={`office-prop office-prop-${prop.type} ${activePropIds.has(prop.id) ? 'is-engaged' : ''}`}
                        data-zone={zone.id}
                        data-prop-id={prop.id}
                        style={{ left: `${prop.x}%`, top: `${prop.y}%`, width: `${prop.w ?? 4}%`, height: `${prop.h ?? 4}%` }}
                      />
                    ))}
                  </div>
                )
              })}
            </div>

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`office-handoffs ${visibleHandoffs.length > 0 ? 'is-visible' : 'is-hidden'}`}>
              {visibleHandoffs.map((handoff) => {
                const from = agents.find((agent) => agent.name === handoff.from)
                const to = agents.find((agent) => agent.name === handoff.to)
                const fromPos = from ? motion[from.id]?.position : null
                const toPos = to ? motion[to.id]?.position : null
                if (!fromPos || !toPos) return null
                return (
                  <g key={`${handoff.from}-${handoff.to}`}>
                    <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} className="office-handoff-line" />
                    <text
                      x={(fromPos.x + toPos.x) / 2}
                      y={(fromPos.y + toPos.y) / 2 - 1.4}
                      className="office-handoff-label"
                    >
                      {collaborationLineLabel(handoff)}
                    </text>
                  </g>
                )
              })}
            </svg>

            {agents.map((agent, index) => {
              const state = motion[agent.id]
              const targetZone = state?.targetZone ?? intentZone(agent.intent, agent.id)
              const position = state?.position ?? zoneById(homeZoneByAgent[agent.id] ?? 'meeting-area').anchor
              const selectedAgent = selectedAgentId === agent.id
              const directionClass = state?.facing === 'left' ? 'sim-agent-facing-left' : 'sim-agent-facing-right'
              const isMoving = Boolean(state?.isMoving)
              const pose = poseForMotion(targetZone, state?.action ?? agent.interactionLabel, isMoving, agent.activityState)
              const placement = placementForZone(targetZone)
              const motionClass = agent.sceneState === 'blocked'
                ? 'sim-agent-shake'
                : isMoving
                  ? 'sim-agent-walk'
                  : agent.activityState === 'waiting_input'
                    ? 'sim-agent-wait'
                    : agent.activityState === 'collaborating'
                      ? 'sim-agent-present'
                      : agent.activityState === 'cooldown'
                        ? 'sim-agent-rest'
                        : 'sim-agent-float'

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent(agent.id)}
                  className={`sim-agent ${selectedAgent ? 'is-selected' : ''}`}
                  style={{ left: `${position.x}%`, top: `${position.y + placement.lift}%`, ['--agent-scale' as string]: `${placement.scale}`, ['--label-opacity' as string]: selectedAgent ? '1' : '0.66' } as CSSProperties}
                  aria-label={`Focus ${agent.name}`}
                >
                  <div className={`sim-agent-glow workspace-${agent.presence}`} />
                  <div className={`sim-agent-body ${directionClass} ${motionClass}`}>
                    <div className="sim-agent-stage">
                      {renderCreature(agent, pose, directionClass)}
                      <div className="sim-agent-status-stack">
                        <span className={`sim-agent-status is-always-visible ${sceneStatusTone(agent.sceneState)}`}>
                          <span className="sim-agent-status-dot" />
                          {agent.sceneLabel}
                        </span>
                        <div className="sim-agent-nameplate">
                          <span className="sim-agent-name">{agent.name}</span>
                        </div>
                      </div>
                      {selectedAgent ? <div className="sim-agent-taskline">{state?.action ?? agent.interactionLabel}</div> : null}
                    </div>
                  </div>
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => {
                void handleWorkspaceFocusToggle()
              }}
              className="office-sim-focus-toggle"
              aria-label={isWorkspaceFocused ? 'Exit workspace focus view' : 'Maximize workspace focus view'}
              aria-pressed={isWorkspaceFocused}
              title={isWorkspaceFocused ? 'Exit focus view' : 'Focus workspace view'}
            >
              {isWorkspaceFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>{isWorkspaceFocused ? 'Exit focus' : 'Focus view'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 xl:col-span-1">
          {agents.length > 0 && selected ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Selected agent</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{selected.name}</div>
                  <div className="mt-1 text-sm text-slate-400">{selected.station}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${presenceClasses[selected.presence]}`}>{selected.stateLabel}</span>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${selected.avatarClass} p-[1px]`}>
                    <div className="grid gap-4 rounded-[27px] bg-slate-950/88 p-4 sm:grid-cols-[auto_1fr]">
                      <div className="flex items-center justify-center">
                        {renderCreature(selected, poseForMotion(selectedMotion?.targetZone ?? intentZone(selected.intent, selected.id), selectedMotion?.action ?? selected.interactionLabel, Boolean(selectedMotion?.isMoving), selected.activityState), 'sim-agent-facing-right', true)}
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300">{selected.model}</span>
                          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300">{selected.kindLabel}</span>
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200">{selected.activityLabel}</span>
                          <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-300">{selected.activityConfidence} confidence</span>
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${healthClasses[selected.workloadTone]}`}>{selected.workloadLabel}</span>
                        </div>
                        <div className="mt-3 text-sm text-slate-300">{selected.focus}</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current zone</div>
                            <div className="mt-1 text-xs font-medium text-white">{zoneById(selectedMotion?.targetZone ?? intentZone(selected.intent, selected.id)).label}</div>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Interaction</div>
                            <div className="mt-1 text-xs font-medium text-white">{selectedMotion?.action ?? selected.interactionLabel}</div>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Signals</div>
                            <div className="mt-1 text-xs font-medium text-white">{selected.signalCount} markers</div>
                          </div>
                          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last activity</div>
                            <div className="mt-1 text-xs font-medium text-white">{formatRelativeMs(selected.freshestAgeMs)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                    <Cpu className="h-4 w-4 text-cyan-300" /> Current task read
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Task summary</div>
                      <div className="mt-1 break-words text-slate-200">{selected.taskSummary || selected.activitySummary}</div>
                    </div>
                    {selected.sessionLabel ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Session label</div>
                        <div className="mt-1 break-words text-slate-200">{selected.sessionLabel}</div>
                      </div>
                    ) : null}
                    {selected.taskSourceLabel ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Task source</div>
                        <div className="mt-1 break-words text-slate-200">{selected.taskSourceLabel}</div>
                      </div>
                    ) : null}
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">{selected.truthLabel}</div>
                      <div className="mt-1 text-slate-200">{selected.activitySource}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Live mapping</div>
                      <div className="mt-1 text-slate-200">{selected.liveReason}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Office read</div>
                      <div className="mt-1 text-slate-200">{selected.sceneNote}</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current note</div>
                      <div className="mt-1 text-slate-200">{selected.note}</div>
                    </div>
                    {selected.collaborationPartner && selected.collaborationNote ? (
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">Collaboration</div>
                        <div className="mt-1 text-slate-200">Working with {selected.collaborationPartner}</div>
                        <div className="mt-1 text-xs text-slate-400">{selected.collaborationNote}</div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {agents.map((agent) => (
                    <button
                      key={`${agent.id}-chip`}
                      type="button"
                      onClick={() => onSelectAgent(agent.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${selected.id === agent.id ? 'border-cyan-400/50 bg-slate-900/95 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/90'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">{agent.name}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{agent.station}</div>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${presenceClasses[agent.presence]}`}>{agent.sceneLabel}</span>
                      </div>
                      <div className="mt-3 text-xs text-slate-400">{agent.activitySummary}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Waiting for workspace data…</div>
          )}
        </div>

        <div className="space-y-4 xl:col-span-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Radio className="h-4 w-4 text-cyan-300" /> Collaboration links
            </div>
            <div className="mb-3 text-xs text-slate-500">In the scene, dotted blue lines are reserved for explicit shared work or handoff links so the room does not imply fake teamwork.</div>
            {handoffs.length > 0 ? (
              <div className="space-y-2">
                {handoffs.map((handoff) => (
                  <div key={`${handoff.from}-${handoff.to}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-medium text-white">{handoff.from} → {handoff.to}</div>
                        <div className="mt-1 text-xs text-slate-500">{handoff.summary}</div>
                        {handoff.reason ? <div className="mt-1 text-[11px] text-slate-400">{handoff.reason}</div> : null}
                        {handoff.sharedTask ? <div className="mt-2 text-[11px] text-cyan-200">Shared task: {handoff.sharedTask}</div> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {handoff.modeLabel ? <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-200">{handoff.modeLabel}</span> : null}
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300">{handoff.gapLabel}</span>
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-300">{handoff.confidenceLabel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">No explicit collaboration or handoff link is visible right now, so the dotted blue connector stays hidden.</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <AlertTriangle className="h-4 w-4 text-cyan-300" /> Nearby signals
            </div>
            <div className="space-y-2">
              {selected?.eventMatches.length ? (
                selected.eventMatches.map((event) => (
                  <div key={`${selected.id}-${event.title}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white">{event.title}</div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] ${healthClasses[event.severity]}`}>{event.time}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{event.detail}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">No mapped events are currently clustered around this agent.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Activity className="h-4 w-4 text-cyan-300" /> Event strip
            </div>
            <div className="space-y-2">
              {events.slice(0, 4).map((event) => (
                <div key={`${event.time}-${event.title}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">{event.title}</div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] ${healthClasses[event.severity]}`}>{event.time}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{event.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <Coffee className="h-4 w-4 text-cyan-300" /> Behavior cues
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {selected?.observations.map((item) => (
                <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
