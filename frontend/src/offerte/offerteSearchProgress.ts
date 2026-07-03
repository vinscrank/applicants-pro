export type OfferteSearchPhase = 'idle' | 'parsing' | 'searching'

type Listener = (phase: OfferteSearchPhase) => void

let phase: OfferteSearchPhase = 'idle'
const listeners = new Set<Listener>()

export function getOfferteSearchPhase(): OfferteSearchPhase {
  return phase
}

export function subscribeOfferteSearchPhase(listener: Listener): () => void {
  listeners.add(listener)
  listener(phase)
  return () => {
    listeners.delete(listener)
  }
}

export function setOfferteSearchPhase(next: OfferteSearchPhase): void {
  if (phase === next) return
  phase = next
  listeners.forEach((listener) => listener(next))
}
