export interface ActionRun {
  id: string
  name: string
  startedAt: string
  finishedAt: string
  status: 'success' | 'error'
  output: string
  error?: string
}

const MAX_RUNS = 100
const runs: ActionRun[] = []

export function recordRun(run: ActionRun): void {
  runs.unshift(run)
  if (runs.length > MAX_RUNS) runs.length = MAX_RUNS
}

export function getRuns(): ActionRun[] {
  return runs
}
