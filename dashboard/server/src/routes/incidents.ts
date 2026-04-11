import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { authHook } from '../auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface Incident {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  remediation: string
  status: 'active' | 'mitigated'
  detectedAt: string
}

function loadIncidents(): Incident[] {
  const configPath = join(__dirname, '../../../incidents.config.json')
  const raw = readFileSync(configPath, 'utf8')
  return JSON.parse(raw) as Incident[]
}

const INCIDENTS = loadIncidents()

export async function incidentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/incidents', async (_req, reply) => {
    return reply.send(INCIDENTS)
  })
}
