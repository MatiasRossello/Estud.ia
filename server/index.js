import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gradeWritten } from './grade.js'

const app = express()
app.use(express.json({ limit: '100kb' }))

// Límite simple por IP para no quemar la cuota gratis de OpenRouter.
const hits = new Map()
function rateLimit(req, res, next) {
  const now = Date.now()
  const ip = req.ip ?? 'unknown'
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (recent.length >= 60) return res.status(429).json({ error: 'Demasiadas solicitudes, esperá un minuto' })
  recent.push(now)
  hits.set(ip, recent)
  next()
}

app.post('/api/grade', rateLimit, async (req, res) => {
  try {
    res.json(await gradeWritten(req.body))
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message })
  }
})

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
app.use(express.static(dist))
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => console.log(`estud.ia API en http://localhost:${port}`))
