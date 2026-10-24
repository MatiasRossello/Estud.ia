import { useSyncExternalStore } from 'react'

export interface AnswerRecord {
  correct: boolean
  /** 0..1 — en respuestas escritas lo da la IA. */
  score: number
  points: number
  timeMs: number
  given: unknown
  feedback?: string
}

export interface Round {
  qids: number[]
  /** Orden aleatorio de las opciones de cada pregunta de opción múltiple. */
  optionOrders: Record<number, number[]>
  answers: Record<number, AnswerRecord>
  startedAt: number
  finishedAt?: number
}

export type SessionMode = 'full' | 'partial' | 'review'

export interface Session {
  id: string
  testId: string
  testTitle: string
  mode: SessionMode
  bankSize: number
  qids: number[]
  rounds: Round[]
  createdAt: number
  leaderboard?: { status: 'sent' | 'error'; name?: string; error?: string }
}

interface Store {
  v: 1
  ownerToken: string
  playerId: string
  playerName: string | null
  sessions: Session[]
}

const KEY = 'estudia:v1'
const MAX_SESSIONS = 1000

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Store
      if (s.v === 1 && s.ownerToken && s.playerId) return { ...s, sessions: s.sessions ?? [] }
    }
  } catch {
    // localStorage no disponible o corrupto: arrancamos de cero.
  }
  return { v: 1, ownerToken: crypto.randomUUID(), playerId: crypto.randomUUID(), playerName: null, sessions: [] }
}

let state = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Sin espacio o modo privado: el progreso vive solo en memoria.
  }
}
persist()

export function getStore() {
  return state
}

export function update(fn: (s: Store) => Store) {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
}

export function useStore(): Store {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function upsertSession(session: Session) {
  update((s) => {
    const others = s.sessions.filter((x) => x.id !== session.id)
    return { ...s, sessions: [...others, session].slice(-MAX_SESSIONS) }
  })
}

export function setPlayerName(name: string) {
  update((s) => ({ ...s, playerName: name }))
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = load()
    listeners.forEach((l) => l())
  }
})
