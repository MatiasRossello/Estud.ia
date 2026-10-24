import type { Question, QuestionType } from './types'
import type { AnswerRecord, Round, Session, SessionMode } from './storage'

/** Segundos para responder antes de que el puntaje baje al mínimo (estilo Kahoot). */
export const TIME_LIMITS: Record<QuestionType, number> = {
  verdadero_falso: 15,
  multiple_choice: 20,
  seleccion_multiple: 30,
  completar: 40,
  texto: 60,
}
export const MAX_POINTS = 1000
/** Una respuesta escrita cuenta como correcta desde este puntaje de la IA. */
export const CORRECT_THRESHOLD = 0.7

export function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Responder al instante da 1000 puntos; al agotar el tiempo, 500. Se multiplica por el acierto (0..1). */
export function computePoints(score: number, timeMs: number, tipo: QuestionType) {
  const ratio = Math.min(timeMs / (TIME_LIMITS[tipo] * 1000), 1)
  return Math.round(score * MAX_POINTS * (1 - ratio / 2))
}

export function newRound(qids: number[], questions: Question[]): Round {
  const order = shuffle(qids)
  const optionOrders: Record<number, number[]> = {}
  for (const id of order) {
    const q = questions[id]
    if (q.tipo === 'multiple_choice' || q.tipo === 'seleccion_multiple') {
      optionOrders[id] = shuffle(q.opciones.map((_, i) => i))
    }
  }
  return { qids: order, optionOrders, answers: {}, startedAt: Date.now() }
}

export function newSession(
  test: { id: string; title: string; question_count: number; questions: Question[] },
  mode: SessionMode,
  qids: number[],
): Session {
  return {
    id: crypto.randomUUID(),
    testId: test.id,
    testTitle: test.title,
    mode,
    bankSize: test.question_count,
    qids,
    rounds: [newRound(qids, test.questions)],
    createdAt: Date.now(),
  }
}

export function pickRandom(total: number, count: number) {
  return shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, count)
}

export function gradeChoice(q: Question, given: unknown): number {
  if (q.tipo === 'verdadero_falso') return given === q.respuesta ? 1 : 0
  if (q.tipo === 'multiple_choice') return given === q.correctas[0] ? 1 : 0
  if (q.tipo === 'seleccion_multiple') {
    const set = new Set(given as number[])
    return set.size === q.correctas.length && q.correctas.every((c) => set.has(c)) ? 1 : 0
  }
  throw new Error('gradeChoice solo corrige preguntas de opciones')
}

export async function gradeWritten(q: Question, given: string[]) {
  const items =
    q.tipo === 'completar'
      ? q.respuestas.map((expected, i) => ({ expected, answer: given[i] ?? '' }))
      : q.tipo === 'texto'
        ? [{ expected: q.respuestas, answer: given[0] ?? '' }]
        : []
  const res = await fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consigna: q.consigna, items }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status} al corregir`)
  const feedback = (data.items as { feedback?: string }[])
    .map((it) => it.feedback)
    .filter(Boolean)
    .join(' · ')
  return { score: Number(data.score) || 0, feedback }
}

export const isRoundDone = (r: Round) => r.qids.every((id) => id in r.answers)
export const isSessionDone = (s: Session) => isRoundDone(s.rounds[s.rounds.length - 1])

/** Preguntas acertadas acumuladas al terminar cada ronda (la ronda 0 es el primer intento). */
export function cumulativeCorrect(s: Session): number[] {
  const solved = new Set<number>()
  return s.rounds.map((r) => {
    for (const [id, a] of Object.entries(r.answers)) if (a.correct) solved.add(Number(id))
    return solved.size
  })
}

/** Preguntas de la sesión que todavía no se respondieron bien en ninguna ronda. */
export function pendingWrong(s: Session): number[] {
  const solved = new Set<number>()
  for (const r of s.rounds) for (const [id, a] of Object.entries(r.answers)) if (a.correct) solved.add(Number(id))
  return s.qids.filter((id) => !solved.has(id))
}

export function roundStats(r: Round) {
  const answers = Object.values(r.answers) as AnswerRecord[]
  return {
    correct: answers.filter((a) => a.correct).length,
    points: answers.reduce((s, a) => s + a.points, 0),
    timeMs: answers.reduce((s, a) => s + a.timeMs, 0),
  }
}

/** Cuántas veces se falló cada pregunta en todo el historial de un test. */
export function wrongCounts(sessions: Session[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const s of sessions)
    for (const r of s.rounds)
      for (const [id, a] of Object.entries(r.answers))
        if (!a.correct) counts.set(Number(id), (counts.get(Number(id)) ?? 0) + 1)
  return counts
}

export function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}
