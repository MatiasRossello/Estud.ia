// Función serverless para Vercel; reutiliza la misma lógica que el servidor Express.
import { gradeWritten } from '../server/grade.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  try {
    res.status(200).json(await gradeWritten(req.body))
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message })
  }
}
