export type JobsSearchPhase = 'idle' | 'parsing' | 'searching'

type Listener = (phase: JobsSearchPhase) => void

let phase: JobsSearchPhase = 'idle'
const listeners = new Set<Listener>()

export function getJobsSearchPhase(): JobsSearchPhase {
  return phase
}

export function subscribeJobsSearchPhase(listener: Listener): () => void {
  listeners.add(listener)
  listener(phase)
  return () => {
    listeners.delete(listener)
  }
}

export function setJobsSearchPhase(next: JobsSearchPhase): void {
  if (phase === next) return
  phase = next
  listeners.forEach((listener) => listener(next))
}
