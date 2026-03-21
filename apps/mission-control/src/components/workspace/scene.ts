import { BriefcaseBusiness, Coffee, MessageSquare, Search, ShieldAlert, Sparkles, Wrench } from 'lucide-react'
import type { AgentIntent, TaskHintId, WorkspaceAgent } from './types'

export type ZoneId =
  | 'command-desk'
  | 'engineering-bay'
  | 'research-corner'
  | 'comms-desk'
  | 'meeting-area'
  | 'alert-wall'
  | 'break-area'

export type Point = { x: number; y: number }

type PropType = 'desk' | 'monitor' | 'table' | 'plant' | 'coffee' | 'display' | 'sofa' | 'shelf' | 'lamp' | 'rug' | 'window' | 'chair' | 'cabinet' | 'whiteboard' | 'server'

export type ZoneProp = {
  id: string
  type: PropType
  x: number
  y: number
  w?: number
  h?: number
}

export type Zone = {
  id: ZoneId
  label: string
  theme: string
  position: { x: number; y: number; w: number; h: number }
  anchor: Point
  entrance: string
  icon: typeof Sparkles
  accentClass: string
  props: ZoneProp[]
  seats?: Point[]
}

export const zoneDefinitions: Zone[] = [
  {
    id: 'command-desk',
    label: 'Command deck',
    theme: 'Routing, approvals, orchestration',
    position: { x: 6, y: 11, w: 24, h: 20 },
    anchor: { x: 18, y: 22 },
    entrance: 'west-hall',
    icon: Sparkles,
    accentClass: 'from-cyan-300/24 via-sky-300/12 to-blue-400/10',
    props: [
      { id: 'cmd-window', type: 'window', x: 8, y: 14, w: 7, h: 4 },
      { id: 'cmd-whiteboard', type: 'whiteboard', x: 8.5, y: 19.5, w: 5.5, h: 5.8 },
      { id: 'cmd-cabinet-left', type: 'cabinet', x: 21.3, y: 13.5, w: 3.2, h: 4.4 },
      { id: 'cmd-shelf', type: 'shelf', x: 24.2, y: 14.4, w: 3.2, h: 9.2 },
      { id: 'cmd-cabinet', type: 'cabinet', x: 24, y: 23.1, w: 3.4, h: 4.8 },
      { id: 'cmd-rug', type: 'rug', x: 11.6, y: 24.2, w: 14.8, h: 3.9 },
      { id: 'cmd-desk', type: 'desk', x: 14.8, y: 21.2, w: 10.8, h: 4 },
      { id: 'cmd-monitor', type: 'monitor', x: 18.1, y: 18.4, w: 5.1, h: 2.8 },
      { id: 'cmd-chair', type: 'chair', x: 17.8, y: 24.2, w: 4, h: 2.8 },
      { id: 'cmd-guest-chair', type: 'chair', x: 23, y: 25.2, w: 3.4, h: 2.6 },
      { id: 'cmd-lamp', type: 'lamp', x: 25.1, y: 18.7, w: 1.8, h: 5.1 },
      { id: 'cmd-plant', type: 'plant', x: 10.1, y: 16, w: 3.1, h: 5 },
      { id: 'cmd-coffee', type: 'coffee', x: 22.2, y: 21.8, w: 2.2, h: 2.2 },
    ],
    seats: [{ x: 18, y: 26 }],
  },
  {
    id: 'engineering-bay',
    label: 'Engineering bay',
    theme: 'Builds, tooling, implementation',
    position: { x: 70, y: 11, w: 24, h: 20 },
    anchor: { x: 82, y: 22 },
    entrance: 'east-hall',
    icon: Wrench,
    accentClass: 'from-amber-200/26 via-orange-300/14 to-rose-400/10',
    props: [
      { id: 'eng-window', type: 'window', x: 84, y: 14, w: 7, h: 4 },
      { id: 'eng-cabinet-left', type: 'cabinet', x: 71.8, y: 13.8, w: 3.2, h: 4 },
      { id: 'eng-shelf', type: 'shelf', x: 75.2, y: 14.1, w: 2.6, h: 9.3 },
      { id: 'eng-server-main', type: 'server', x: 71, y: 18.8, w: 3.8, h: 8.4 },
      { id: 'eng-server-sidecar', type: 'server', x: 75.1, y: 19.8, w: 2.4, h: 7.3 },
      { id: 'eng-rug', type: 'rug', x: 75, y: 24, w: 14, h: 4 },
      { id: 'eng-desk', type: 'desk', x: 76.2, y: 21.1, w: 11.2, h: 4.1 },
      { id: 'eng-chair', type: 'chair', x: 79.1, y: 24.2, w: 4, h: 2.8 },
      { id: 'eng-chair-spare', type: 'chair', x: 85.3, y: 24.4, w: 3.4, h: 2.6 },
      { id: 'eng-monitor', type: 'monitor', x: 79.8, y: 18.3, w: 5.2, h: 2.9 },
      { id: 'eng-display', type: 'display', x: 88.2, y: 14.1, w: 3.1, h: 10 },
      { id: 'eng-whiteboard', type: 'whiteboard', x: 85.9, y: 20.2, w: 5.2, h: 5.1 },
      { id: 'eng-lamp', type: 'lamp', x: 74.3, y: 19.1, w: 1.8, h: 5.1 },
      { id: 'eng-cabinet', type: 'cabinet', x: 88.2, y: 24.5, w: 3, h: 3.2 },
      { id: 'eng-coffee', type: 'coffee', x: 85.7, y: 21.5, w: 2.1, h: 2.1 },
    ],
    seats: [{ x: 82, y: 26 }],
  },
  {
    id: 'research-corner',
    label: 'Research garden',
    theme: 'Scans, fact-finding, evidence',
    position: { x: 8, y: 65, w: 22, h: 18 },
    anchor: { x: 20, y: 75 },
    entrance: 'south-west-hall',
    icon: Search,
    accentClass: 'from-emerald-200/24 via-teal-300/12 to-cyan-400/10',
    props: [
      { id: 'res-window', type: 'window', x: 10, y: 68, w: 7, h: 4 },
      { id: 'res-whiteboard', type: 'whiteboard', x: 10.8, y: 72.8, w: 5.4, h: 5.2 },
      { id: 'res-cabinet', type: 'cabinet', x: 22.7, y: 75.6, w: 4.1, h: 4.1 },
      { id: 'res-shelf', type: 'shelf', x: 24.3, y: 67.8, w: 3.8, h: 10.2 },
      { id: 'res-rug', type: 'rug', x: 12.8, y: 76, w: 14.5, h: 4 },
      { id: 'res-desk', type: 'desk', x: 15, y: 72.9, w: 10.3, h: 4 },
      { id: 'res-chair', type: 'chair', x: 18, y: 76.1, w: 4, h: 2.8 },
      { id: 'res-chair-side', type: 'chair', x: 13.5, y: 78.3, w: 3.4, h: 2.5 },
      { id: 'res-monitor', type: 'monitor', x: 19, y: 69.7, w: 5, h: 3 },
      { id: 'res-lamp', type: 'lamp', x: 24.9, y: 70.8, w: 2, h: 5 },
      { id: 'res-plant', type: 'plant', x: 10.2, y: 68.9, w: 3, h: 5 },
      { id: 'res-plant-2', type: 'plant', x: 12.1, y: 77.1, w: 3, h: 5 },
      { id: 'res-coffee', type: 'coffee', x: 21.2, y: 73.8, w: 2.1, h: 2.1 },
    ],
    seats: [{ x: 20, y: 78 }],
  },
  {
    id: 'comms-desk',
    label: 'Comms lounge',
    theme: 'Messages, docs, reminders',
    position: { x: 70, y: 65, w: 22, h: 18 },
    anchor: { x: 82, y: 75 },
    entrance: 'south-east-hall',
    icon: MessageSquare,
    accentClass: 'from-fuchsia-200/24 via-pink-300/12 to-rose-400/10',
    props: [
      { id: 'comms-window', type: 'window', x: 84, y: 68, w: 7, h: 4 },
      { id: 'comms-shelf', type: 'shelf', x: 72, y: 68, w: 3.8, h: 10 },
      { id: 'comms-cabinet', type: 'cabinet', x: 72, y: 76.8, w: 4, h: 3.2 },
      { id: 'comms-rug', type: 'rug', x: 75, y: 76, w: 14, h: 4 },
      { id: 'comms-desk', type: 'desk', x: 76, y: 72.9, w: 10.4, h: 4 },
      { id: 'comms-chair', type: 'chair', x: 79.1, y: 76.2, w: 4, h: 2.8 },
      { id: 'comms-chair-guest', type: 'chair', x: 85.4, y: 77.1, w: 3.3, h: 2.5 },
      { id: 'comms-monitor', type: 'monitor', x: 79, y: 69.8, w: 5.2, h: 3 },
      { id: 'comms-whiteboard', type: 'whiteboard', x: 85, y: 73.9, w: 5.2, h: 4.4 },
      { id: 'comms-lamp', type: 'lamp', x: 74.2, y: 70.9, w: 2, h: 5 },
      { id: 'comms-plant', type: 'plant', x: 88, y: 69, w: 3, h: 5 },
      { id: 'comms-coffee', type: 'coffee', x: 86, y: 76, w: 2.2, h: 2.2 },
      { id: 'comms-coffee-guest', type: 'coffee', x: 74.8, y: 74.7, w: 1.9, h: 1.9 },
    ],
    seats: [{ x: 82, y: 78 }],
  },
  {
    id: 'meeting-area',
    label: 'Strategy table',
    theme: 'Handoffs, escalation huddles, converge points',
    position: { x: 34, y: 38, w: 32, h: 18 },
    anchor: { x: 50, y: 48 },
    entrance: 'center-hall',
    icon: BriefcaseBusiness,
    accentClass: 'from-slate-100/16 via-cyan-200/12 to-white/10',
    props: [
      { id: 'meeting-rug', type: 'rug', x: 39, y: 44, w: 22, h: 10 },
      { id: 'meeting-table', type: 'table', x: 43.8, y: 45, w: 12.4, h: 6.4 },
      { id: 'meeting-display', type: 'display', x: 50, y: 39, w: 9, h: 4 },
      { id: 'meeting-whiteboard', type: 'whiteboard', x: 38.8, y: 39, w: 7.2, h: 4.2 },
      { id: 'meeting-lamp', type: 'lamp', x: 58, y: 43, w: 2, h: 6 },
      { id: 'meeting-plant', type: 'plant', x: 38, y: 42, w: 3, h: 5 },
      { id: 'meeting-chair-1', type: 'chair', x: 42.8, y: 50.1, w: 3.2, h: 2.8 },
      { id: 'meeting-chair-2', type: 'chair', x: 53.8, y: 50.1, w: 3.2, h: 2.8 },
      { id: 'meeting-chair-3', type: 'chair', x: 47.6, y: 41.6, w: 3.2, h: 2.6 },
      { id: 'meeting-chair-4', type: 'chair', x: 47.6, y: 52.9, w: 3.2, h: 2.6 },
      { id: 'meeting-coffee', type: 'coffee', x: 56.9, y: 46.6, w: 1.8, h: 1.8 },
    ],
    seats: [
      { x: 42, y: 48 },
      { x: 50, y: 42 },
      { x: 58, y: 48 },
      { x: 50, y: 54 },
    ],
  },
  {
    id: 'alert-wall',
    label: 'Alert wall',
    theme: 'Incidents, queues, hot signals',
    position: { x: 36, y: 8, w: 28, h: 15 },
    anchor: { x: 50, y: 18 },
    entrance: 'north-hall',
    icon: ShieldAlert,
    accentClass: 'from-rose-300/24 via-orange-300/12 to-amber-400/10',
    props: [
      { id: 'alert-window', type: 'window', x: 38, y: 11, w: 6.8, h: 4 },
      { id: 'alert-server-left', type: 'server', x: 36.8, y: 13, w: 3.8, h: 8.1 },
      { id: 'alert-display', type: 'display', x: 42, y: 13, w: 16, h: 5 },
      { id: 'alert-console', type: 'desk', x: 44, y: 18.9, w: 12, h: 3.2 },
      { id: 'alert-chair', type: 'chair', x: 47.9, y: 21.1, w: 4, h: 2.8 },
      { id: 'alert-shelf', type: 'shelf', x: 58, y: 12, w: 3.8, h: 9 },
      { id: 'alert-cabinet', type: 'cabinet', x: 58.2, y: 19.8, w: 3.2, h: 2.8 },
      { id: 'alert-server-right', type: 'server', x: 61.2, y: 13.6, w: 2.3, h: 7.3 },
      { id: 'alert-lamp', type: 'lamp', x: 56.9, y: 14.9, w: 2, h: 5 },
      { id: 'alert-coffee', type: 'coffee', x: 54.6, y: 19.2, w: 1.8, h: 1.8 },
    ],
    seats: [{ x: 50, y: 22 }],
  },
  {
    id: 'break-area',
    label: 'Break nook',
    theme: 'Cooldown, coffee, idle fallback',
    position: { x: 38, y: 71, w: 24, h: 15 },
    anchor: { x: 50, y: 79 },
    entrance: 'south-hall',
    icon: Coffee,
    accentClass: 'from-indigo-200/22 via-slate-200/12 to-cyan-300/10',
    props: [
      { id: 'break-window', type: 'window', x: 42, y: 73, w: 7, h: 4 },
      { id: 'break-rug', type: 'rug', x: 41, y: 79, w: 18, h: 5 },
      { id: 'break-coffee', type: 'coffee', x: 48, y: 75, w: 2.6, h: 2.6 },
      { id: 'break-coffee-dark', type: 'coffee', x: 51.6, y: 75.6, w: 1.9, h: 1.9 },
      { id: 'break-sofa', type: 'sofa', x: 42, y: 79, w: 8, h: 4 },
      { id: 'break-chair', type: 'chair', x: 53, y: 80, w: 4, h: 3 },
      { id: 'break-chair-side', type: 'chair', x: 56.9, y: 79, w: 3.2, h: 2.8 },
      { id: 'break-cabinet', type: 'cabinet', x: 56, y: 74, w: 4, h: 4 },
      { id: 'break-lamp', type: 'lamp', x: 54, y: 77, w: 2, h: 5 },
      { id: 'break-plant', type: 'plant', x: 56, y: 78, w: 3, h: 5 },
    ],
    seats: [{ x: 46, y: 82 }, { x: 54, y: 82 }],
  },
]

export const homeZoneByAgent: Record<string, ZoneId> = {
  jarvis: 'command-desk',
  elon: 'engineering-bay',
  jensen: 'research-corner',
  trinity: 'comms-desk',
}

export const waypointPositions: Record<string, Point> = {
  'west-hall': { x: 30, y: 22 },
  'east-hall': { x: 70, y: 22 },
  'north-hall': { x: 50, y: 25 },
  'south-hall': { x: 50, y: 67 },
  'south-west-hall': { x: 30, y: 75 },
  'south-east-hall': { x: 70, y: 75 },
  'center-hall': { x: 50, y: 48 },
  'cross-north-west': { x: 30, y: 48 },
  'cross-north-east': { x: 70, y: 48 },
}

export const waypointGraph: Record<string, string[]> = {
  'west-hall': ['cross-north-west', 'north-hall'],
  'east-hall': ['cross-north-east', 'north-hall'],
  'north-hall': ['west-hall', 'east-hall', 'center-hall'],
  'center-hall': ['north-hall', 'south-hall', 'cross-north-west', 'cross-north-east'],
  'south-hall': ['center-hall', 'south-west-hall', 'south-east-hall'],
  'south-west-hall': ['south-hall', 'cross-north-west'],
  'south-east-hall': ['south-hall', 'cross-north-east'],
  'cross-north-west': ['west-hall', 'center-hall', 'south-west-hall'],
  'cross-north-east': ['east-hall', 'center-hall', 'south-east-hall'],
}

const zonePropPriorityByAgent: Record<string, Partial<Record<ZoneId, string[]>>> = {
  jarvis: {
    'command-desk': ['cmd-monitor', 'cmd-desk', 'cmd-whiteboard', 'cmd-cabinet', 'cmd-coffee'],
    'meeting-area': ['meeting-table', 'meeting-display'],
    'alert-wall': ['alert-display', 'alert-console'],
    'break-area': ['break-coffee', 'break-sofa'],
  },
  elon: {
    'engineering-bay': ['eng-server-main', 'eng-monitor', 'eng-display', 'eng-whiteboard', 'eng-desk', 'eng-coffee'],
    'meeting-area': ['meeting-display', 'meeting-table'],
    'alert-wall': ['alert-display', 'alert-server-left', 'alert-console'],
    'break-area': ['break-coffee', 'break-chair'],
  },
  jensen: {
    'research-corner': ['res-whiteboard', 'res-monitor', 'res-shelf', 'res-desk', 'res-window', 'res-coffee'],
    'meeting-area': ['meeting-whiteboard', 'meeting-table'],
    'alert-wall': ['alert-display', 'alert-console'],
    'break-area': ['break-sofa', 'break-coffee'],
  },
  trinity: {
    'comms-desk': ['comms-monitor', 'comms-desk', 'comms-whiteboard', 'comms-cabinet', 'comms-coffee'],
    'meeting-area': ['meeting-table', 'meeting-display'],
    'alert-wall': ['alert-display', 'alert-console'],
    'break-area': ['break-coffee', 'break-chair'],
  },
}

const zonePropPriorityByTaskHint: Record<TaskHintId, Partial<Record<ZoneId, string[]>>> = {
  coding: {
    'engineering-bay': ['eng-monitor', 'eng-display', 'eng-server-main', 'eng-whiteboard', 'eng-desk'],
    'command-desk': ['cmd-monitor', 'cmd-whiteboard', 'cmd-desk'],
  },
  research: {
    'research-corner': ['res-whiteboard', 'res-monitor', 'res-shelf', 'res-desk', 'res-window'],
    'meeting-area': ['meeting-whiteboard', 'meeting-display', 'meeting-table'],
  },
  drafting: {
    'comms-desk': ['comms-desk', 'comms-monitor', 'comms-whiteboard', 'comms-cabinet'],
    'command-desk': ['cmd-desk', 'cmd-monitor', 'cmd-whiteboard'],
  },
  'waiting-approval': {
    'command-desk': ['cmd-monitor', 'cmd-desk', 'cmd-coffee', 'cmd-whiteboard'],
    'comms-desk': ['comms-monitor', 'comms-desk'],
  },
  'incident-response': {
    'alert-wall': ['alert-display', 'alert-console', 'alert-server-left', 'alert-server-right'],
    'engineering-bay': ['eng-server-main', 'eng-monitor'],
  },
  meeting: {
    'meeting-area': ['meeting-table', 'meeting-display', 'meeting-whiteboard'],
  },
  monitoring: {
    'command-desk': ['cmd-monitor', 'cmd-whiteboard'],
    'engineering-bay': ['eng-monitor', 'eng-display', 'eng-server-main'],
    'alert-wall': ['alert-display', 'alert-console'],
    'research-corner': ['res-monitor', 'res-window'],
    'comms-desk': ['comms-monitor', 'comms-whiteboard'],
  },
  communications: {
    'comms-desk': ['comms-monitor', 'comms-desk', 'comms-whiteboard', 'comms-coffee'],
    'meeting-area': ['meeting-table', 'meeting-display'],
  },
  'queue-triage': {
    'alert-wall': ['alert-display', 'alert-console'],
    'comms-desk': ['comms-monitor', 'comms-whiteboard'],
    'command-desk': ['cmd-monitor', 'cmd-whiteboard'],
  },
  orchestration: {
    'command-desk': ['cmd-whiteboard', 'cmd-monitor', 'cmd-desk', 'cmd-cabinet'],
    'meeting-area': ['meeting-table', 'meeting-display'],
  },
}

export function zoneById(zoneId: ZoneId) {
  return zoneDefinitions.find((zone) => zone.id === zoneId) ?? zoneDefinitions[0]
}

export function propById(zoneId: ZoneId, propId?: string) {
  if (!propId) return null
  return zoneById(zoneId).props.find((prop) => prop.id === propId) ?? null
}

export function intentZone(intent: AgentIntent, agentId: string): ZoneId {
  if (intent === 'meeting') return 'meeting-area'
  if (intent === 'alert') return 'alert-wall'
  if (intent === 'break') return 'break-area'
  return homeZoneByAgent[agentId] ?? 'meeting-area'
}

export function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function nearestWaypoint(point: Point) {
  return Object.entries(waypointPositions)
    .sort(([, a], [, b]) => pointDistance(point, a) - pointDistance(point, b))[0]?.[0] ?? 'center-hall'
}

export function buildWaypointPath(fromId: string, toId: string) {
  if (fromId === toId) return [fromId]

  const queue: Array<{ node: string; path: string[] }> = [{ node: fromId, path: [fromId] }]
  const visited = new Set([fromId])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    for (const next of waypointGraph[current.node] ?? []) {
      if (visited.has(next)) continue
      const path = [...current.path, next]
      if (next === toId) return path
      visited.add(next)
      queue.push({ node: next, path })
    }
  }

  return [fromId, toId]
}

export function prioritizedPropsForAgent(zoneId: ZoneId, agent: Pick<WorkspaceAgent, 'id' | 'activityState' | 'sceneState' | 'presence' | 'primaryTaskHint'>) {
  const zone = zoneById(zoneId)
  const rolePriority = zonePropPriorityByAgent[agent.id]?.[zoneId] ?? []
  const taskPriority = agent.primaryTaskHint ? (zonePropPriorityByTaskHint[agent.primaryTaskHint.id]?.[zoneId] ?? []) : []
  const sceneBoost =
    zoneId === 'alert-wall'
      ? ['alert-display', 'alert-console', 'alert-server-left', 'alert-server-right']
      : zoneId === 'meeting-area'
        ? agent.activityState === 'collaborating'
          ? ['meeting-display', 'meeting-whiteboard', 'meeting-table']
          : ['meeting-table', 'meeting-display', 'meeting-whiteboard']
        : agent.activityState === 'waiting_input'
          ? zone.props.filter((prop) => ['whiteboard', 'cabinet', 'shelf', 'coffee'].includes(prop.type)).map((prop) => prop.id)
          : agent.activityState === 'cooldown'
            ? zone.props.filter((prop) => ['coffee', 'chair', 'sofa', 'window'].includes(prop.type)).map((prop) => prop.id)
            : agent.sceneState === 'waiting'
              ? zone.props.filter((prop) => ['whiteboard', 'cabinet', 'shelf', 'coffee'].includes(prop.type)).map((prop) => prop.id)
              : agent.sceneState === 'idle'
                ? zone.props.filter((prop) => ['coffee', 'chair', 'sofa', 'whiteboard'].includes(prop.type)).map((prop) => prop.id)
                : []

  const dedupedIds = [...taskPriority, ...rolePriority, ...sceneBoost, ...zone.props.map((prop) => prop.id)].filter((id, index, items) => items.indexOf(id) === index)
  return dedupedIds.map((id) => zone.props.find((prop) => prop.id === id)).filter((prop): prop is ZoneProp => Boolean(prop))
}
