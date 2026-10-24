import type { Question, QuestionType } from './types'

export const BLANK_RE = /_{3,}/g

const TYPE_ALIASES: Record<string, QuestionType> = {
  multiple_choice: 'multiple_choice',
  opcion_multiple: 'multiple_choice',
  multiple: 'multiple_choice',
  unica: 'multiple_choice',
  seleccion_multiple: 'seleccion_multiple',
  multiple_select: 'seleccion_multiple',
  multi: 'seleccion_multiple',
  varias: 'seleccion_multiple',
  verdadero_falso: 'verdadero_falso',
  true_false: 'verdadero_falso',
  vf: 'verdadero_falso',
  completar: 'completar',
  completar_palabra: 'completar',
  fill_blank: 'completar',
  texto: 'texto',
  escribir: 'texto',
  respuesta_escrita: 'texto',
  abierta: 'texto',
}

export interface ParsedTest {
  titulo: string
  descripcion: string
  preguntas: Question[]
}

type Raw = Record<string, unknown>

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
}

function strList(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]
  return arr.map(str).filter(Boolean)
}

function parseBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  const s = str(v).toLowerCase()
  if (['verdadero', 'true', 'v', 'si', 'sí'].includes(s)) return true
  if (['falso', 'false', 'f', 'no'].includes(s)) return false
  return null
}

function parseQuestion(raw: Raw, n: number): Question {
  const where = `Pregunta ${n}`
  const consigna = str(raw.consigna ?? raw.pregunta ?? raw.enunciado)
  if (!consigna) throw new Error(`${where}: falta "consigna"`)
  const rawType = str(raw.tipo ?? raw.type).toLowerCase().replace(/[\s/-]+/g, '_')
  const tipo = TYPE_ALIASES[rawType]
  if (!tipo) throw new Error(`${where}: tipo "${rawType || '(vacío)'}" no reconocido`)
  const explicacion = str(raw.explicacion) || undefined

  if (tipo === 'multiple_choice' || tipo === 'seleccion_multiple') {
    const opciones = strList(raw.opciones)
    if (opciones.length < 2) throw new Error(`${where}: necesita al menos 2 "opciones"`)
    const rawCorrect = raw.correctas ?? raw.correcta ?? raw.respuesta ?? raw.respuestas
    const list = Array.isArray(rawCorrect) ? rawCorrect : [rawCorrect]
    const correctas = [
      ...new Set(
        list.map((c) => {
          if (typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < opciones.length) return c
          const idx = opciones.findIndex((o) => o.toLowerCase() === str(c).toLowerCase())
          if (idx === -1) throw new Error(`${where}: la correcta "${str(c)}" no coincide con ninguna opción (usá índices desde 0)`)
          return idx
        }),
      ),
    ]
    if (!correctas.length) throw new Error(`${where}: falta "correctas"`)
    if (tipo === 'multiple_choice' && correctas.length > 1) {
      throw new Error(`${where}: "multiple_choice" admite una sola correcta; usá "seleccion_multiple"`)
    }
    return { tipo, consigna, opciones, correctas, explicacion }
  }

  if (tipo === 'verdadero_falso') {
    const respuesta = parseBool(raw.respuesta ?? raw.correcta ?? raw.respuestas)
    if (respuesta === null) throw new Error(`${where}: "respuesta" debe ser true o false`)
    return { tipo, consigna, respuesta, explicacion }
  }

  const rawAnswers = raw.respuestas ?? raw.respuesta ?? raw.correctas
  if (tipo === 'texto') {
    const respuestas = strList(rawAnswers)
    if (!respuestas.length) throw new Error(`${where}: falta "respuestas"`)
    return { tipo, consigna, respuestas, explicacion }
  }

  // completar
  const blanks = (consigna.match(BLANK_RE) ?? []).length
  const text = blanks ? consigna : `${consigna} ___`
  const count = Math.max(blanks, 1)
  let respuestas: string[][]
  if (Array.isArray(rawAnswers) && rawAnswers.some(Array.isArray)) {
    respuestas = rawAnswers.map(strList)
  } else {
    const flat = strList(rawAnswers)
    respuestas = count === 1 ? [flat] : flat.map((a) => [a])
  }
  if (respuestas.length !== count || respuestas.some((r) => !r.length)) {
    throw new Error(`${where}: hay ${count} hueco(s) "___" pero ${respuestas.length} grupo(s) de respuestas`)
  }
  return { tipo, consigna: text, respuestas, explicacion }
}

export function parseTestJson(source: string): ParsedTest {
  let data: unknown
  try {
    data = JSON.parse(source)
  } catch (e) {
    throw new Error(`El archivo no es un JSON válido: ${(e as Error).message}`)
  }
  const obj: Raw = Array.isArray(data) ? { preguntas: data } : (data as Raw)
  if (!obj || typeof obj !== 'object') throw new Error('El JSON debe ser un objeto con "preguntas"')
  const list = obj.preguntas ?? obj.questions
  if (!Array.isArray(list) || !list.length) throw new Error('Falta la lista "preguntas" (o está vacía)')
  if (list.length > 2000) throw new Error('Máximo 2000 preguntas por test')
  return {
    titulo: str(obj.titulo ?? obj.title),
    descripcion: str(obj.descripcion ?? obj.description),
    preguntas: list.map((q, i) => parseQuestion((q ?? {}) as Raw, i + 1)),
  }
}
