export type QuestionType =
  | 'multiple_choice'
  | 'seleccion_multiple'
  | 'verdadero_falso'
  | 'completar'
  | 'texto'
  | 'unir'
  | 'ordenar'

interface Base {
  /** Identificador estable: no cambia aunque se borren o agreguen otras preguntas. */
  id: number
  consigna: string
  explicacion?: string
}

export type Question =
  | (Base & { tipo: 'multiple_choice' | 'seleccion_multiple'; opciones: string[]; correctas: number[] })
  | (Base & { tipo: 'verdadero_falso'; respuesta: boolean })
  /** Una lista de respuestas válidas por cada hueco `___` de la consigna. */
  | (Base & { tipo: 'completar'; respuestas: string[][] })
  | (Base & { tipo: 'texto'; respuestas: string[] })
  /** Cada par es [izquierda, derecha]; en el juego la columna derecha se mezcla. */
  | (Base & { tipo: 'unir'; pares: [string, string][] })
  /** Los pasos en el orden correcto; en el juego se muestran desordenados. */
  | (Base & { tipo: 'ordenar'; pasos: string[] })

export interface TestSummary {
  id: string
  title: string
  description: string | null
  question_count: number
  created_at: string
}

export interface OwnTest extends TestSummary {
  is_public: boolean
}

export interface PublicTest extends TestSummary {
  players: number
}

export interface FullTest {
  id: string
  title: string
  description: string | null
  questions: Question[]
  byId: Map<number, Question>
  question_count: number
  is_public: boolean
  is_owner: boolean
}

export interface LeaderboardRow {
  rank: number
  player_name: string
  score: number
  correct: number
  total: number
  duration_ms: number
  created_at: string
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Opción múltiple',
  seleccion_multiple: 'Selección múltiple',
  verdadero_falso: 'Verdadero o falso',
  completar: 'Completar',
  texto: 'Respuesta escrita',
  unir: 'Unir con flechas',
  ordenar: 'Ordenar los pasos',
}
