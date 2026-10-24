import { createClient } from '@supabase/supabase-js'
import type { FullTest, LeaderboardRow, OwnTest, PublicTest, Question } from './types'
import { getStore } from './storage'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key, { auth: { persistSession: false } })

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

const owner = () => getStore().ownerToken

export const api = {
  createTest: (title: string, description: string, questions: Question[]) =>
    rpc<string>('create_test', { p_owner: owner(), p_title: title, p_description: description, p_questions: questions }),
  myTests: () => rpc<OwnTest[]>('list_my_tests', { p_owner: owner() }),
  publicTests: () => rpc<PublicTest[]>('list_public_tests'),
  async getTest(id: string): Promise<FullTest | null> {
    const rows = await rpc<Omit<FullTest, 'byId'>[]>('get_test', { p_test: id, p_owner: owner() })
    const row = rows[0]
    if (!row) return null
    // Los tests subidos antes de los ids usan su posición, que coincide con el historial guardado.
    const questions = row.questions.map((q, i) => ({ ...q, id: q.id ?? i }))
    return { ...row, questions, byId: new Map(questions.map((q) => [q.id, q])) }
  },
  updateTest: (id: string, title: string, description: string, questions: Question[] | null) =>
    rpc<void>('update_test', {
      p_owner: owner(),
      p_test: id,
      p_title: title,
      p_description: description,
      p_questions: questions,
    }),
  setPublic: (id: string, isPublic: boolean) =>
    rpc<void>('set_test_public', { p_owner: owner(), p_test: id, p_public: isPublic }),
  deleteTest: (id: string) => rpc<void>('delete_test', { p_owner: owner(), p_test: id }),
  submitScore: (testId: string, name: string, score: number, correct: number, total: number, durationMs: number) =>
    rpc<string>('submit_score', {
      p_test: testId,
      p_player: getStore().playerId,
      p_name: name,
      p_score: score,
      p_correct: correct,
      p_total: total,
      p_duration_ms: durationMs,
    }),
  leaderboard: (testId: string) => rpc<LeaderboardRow[]>('get_leaderboard', { p_test: testId }),
  async myRank(testId: string) {
    const rows = await rpc<Omit<LeaderboardRow, 'created_at'>[]>('get_my_rank', {
      p_test: testId,
      p_player: getStore().playerId,
    })
    return rows[0] ?? null
  },
}
