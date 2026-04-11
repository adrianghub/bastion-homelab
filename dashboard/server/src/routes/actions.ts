import type { FastifyInstance } from 'fastify'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { authHook } from '../auth.js'
import { recordRun, getRuns } from '../services/actionJournal.js'

const execAsync = promisify(exec)

// Strict whitelist — no user input is interpolated into these commands
const ACTIONS: Record<string, string> = {
  'ssl-renew': 'docker compose -f /docker-hub/docker-compose.yml run --rm certbot renew --quiet && docker exec bastion-proxy nginx -s reload',
  'rebuild-n8n': '/docker-hub/auto-rebuild-custom.sh',
  'rebuild-nextcloud': '/docker-hub/auto-rebuild-custom.sh',
  'rebuild-htop-web': '/docker-hub/auto-rebuild-custom.sh',
  'nextcloud-update': '/scripts/nextcloud-upgrade.sh',
  'docker-prune': 'docker system prune -a -f',
  'nextcloud-scan-blog': 'docker exec bastion-nextcloud php occ files:scan bastion-cloud --path=/bastion-cloud/files/Blog',
}

export async function actionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/actions', async (_req, reply) => {
    return reply.send(Object.keys(ACTIONS))
  })

  app.get('/api/actions/history', async (_req, reply) => {
    return reply.send(getRuns())
  })

  app.post<{ Params: { name: string } }>('/api/actions/:name', async (req, reply) => {
    const { name } = req.params
    const command = ACTIONS[name]
    if (!command) {
      return reply.status(400).send({ error: 'Unknown action' })
    }
    const startedAt = new Date().toISOString()
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 120_000 })
      const output = stdout || stderr
      recordRun({
        id: crypto.randomUUID(),
        name,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'success',
        output,
      })
      return reply.send({ ok: true, output })
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string }
      const output = err.stdout ?? ''
      const error = err.stderr ?? err.message ?? 'Unknown error'
      recordRun({
        id: crypto.randomUUID(),
        name,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'error',
        output,
        error,
      })
      return reply.status(500).send({ ok: false, output, error })
    }
  })
}
