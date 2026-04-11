/** Downstream module cards → app routes + query hints for the active project. */

export type ProjectModuleKey =
  | 'engineer_dashboard'
  | 'timeline_gantt'
  | 'cost_forecast'
  | 'resource_tables'
  | 'procurement_list'
  | 'ai_copilot'
  | 'owner_budget'
  | 'owner_timeline'
  | 'owner_risks'

export type ModuleCardDef = {
  key: ProjectModuleKey
  title: string
  description: string
  /** Path under /app */
  path: string
  /** Extra search params besides `project` */
  query?: Record<string, string>
  buttonLabel: string
}

export const PROJECT_MODULE_CARDS: ModuleCardDef[] = [
  {
    key: 'engineer_dashboard',
    title: 'Engineer dashboard',
    description: 'Metrics from executive summary',
    path: '/app',
    buttonLabel: 'Open dashboard',
  },
  {
    key: 'timeline_gantt',
    title: 'Timeline / Gantt',
    description: 'Phases → schedule rows',
    path: '/app/timeline',
    buttonLabel: 'Open timeline',
  },
  {
    key: 'cost_forecast',
    title: 'Cost forecast baseline',
    description: 'Phase costs + contingency',
    path: '/app',
    query: { focus: 'forecast' },
    buttonLabel: 'Open forecast',
  },
  {
    key: 'resource_tables',
    title: 'Resource tables',
    description: 'Workforce by trade / phase',
    path: '/app/contacts',
    query: { focus: 'resources' },
    buttonLabel: 'Open resources',
  },
  {
    key: 'procurement_list',
    title: 'Procurement list',
    description: 'BOM + phase alignment',
    path: '/app/procurement',
    buttonLabel: 'Open procurement',
  },
  {
    key: 'ai_copilot',
    title: 'AI Copilot context',
    description: 'Full report JSON as context',
    path: '/app/chatbot',
    buttonLabel: 'Open copilot',
  },
  {
    key: 'owner_budget',
    title: 'Owner budget summary',
    description: 'Totals + phase split',
    path: '/app/insights',
    query: { view: 'budget' },
    buttonLabel: 'Open budget summary',
  },
  {
    key: 'owner_timeline',
    title: 'Owner timeline forecast',
    description: 'Simplified milestones',
    path: '/app/insights',
    query: { view: 'timeline' },
    buttonLabel: 'Open timeline forecast',
  },
  {
    key: 'owner_risks',
    title: 'Owner risk insights',
    description: 'High / medium risks',
    path: '/app/insights',
    query: { view: 'risks' },
    buttonLabel: 'Open risk insights',
  },
]

export function moduleHref(projectId: string, def: ModuleCardDef): string {
  const q = new URLSearchParams({ project: projectId })
  if (def.query) {
    for (const [k, v] of Object.entries(def.query)) q.set(k, v)
  }
  return `${def.path}?${q.toString()}`
}
