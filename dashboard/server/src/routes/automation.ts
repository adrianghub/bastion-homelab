import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { authHook } from '../auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// CONFIG_DIR is set in the Docker image (ENV CONFIG_DIR=/app).
// Falls back to ../../../ relative to this file for local dev and tests.
const CONFIG_DIR = process.env.CONFIG_DIR ?? join(__dirname, '../../../')

export interface AutomationJob {
  id: string
  name: string
  cron: string
  schedule: string
  description: string
  mechanism: string
  status: 'ok' | 'warning' | 'unknown'
  warning?: string
}

function loadJobs(): AutomationJob[] {
  const configPath = join(CONFIG_DIR, 'automation.config.json')
  const raw = readFileSync(configPath, 'utf8')
  const jobs = JSON.parse(raw) as AutomationJob[]
  for (const job of jobs) {
    if (!job.id || !job.name || !job.schedule || !job.status) {
      throw new Error(`automation.config.json: job missing required fields: ${JSON.stringify(job)}`)
    }
  }
  return jobs
}

const JOBS = loadJobs()

export async function automationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/automation', async (_req, reply) => {
    return reply.send(JOBS)
  })
}
