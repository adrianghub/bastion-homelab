import type { FastifyInstance } from 'fastify'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { authHook } from '../auth.js'
import { config } from '../config.js'

interface BackupStatus {
  lastRun: string | null
  success: boolean | null
  duration: string | null
  issues: string[]
}

const KNOWN_ISSUES = [
  'Nextcloud file data (26 GB photos/videos) not included in B2 backup — INCLUDE_NEXTCLOUD_DATA_TO_B2=0',
  'B2 storage cap hit on 2026-01-15 — verify bucket free space before trusting DR',
  'Cert renewal runs bi-monthly but certs expire in 90 days — one missed run leaves ~30 day buffer',
  'Sunday cron includes --volumes flag on docker prune — risk of volume data loss during rebuild window',
]

export async function backupRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/backup/status', async (_req, reply) => {
    const logPath = config.logPaths.backup
    const status: BackupStatus = {
      lastRun: null,
      success: null,
      duration: null,
      issues: KNOWN_ISSUES,
    }

    if (existsSync(logPath)) {
      const content = await readFile(logPath, 'utf8')
      const lines = content.split('\n').filter(Boolean)

      // Find last start and completion markers
      let lastStart: string | null = null
      let lastSuccess: boolean | null = null

      for (const line of lines) {
        if (line.includes('Backup started') || line.includes('=== Backup')) {
          lastStart = line
          lastSuccess = null
        }
        if (line.includes('Backup completed') || line.includes('SUCCESS')) {
          lastSuccess = true
        }
        if (line.includes('FAILED') || line.includes('ERROR') || line.includes('error')) {
          lastSuccess = false
        }
      }

      if (lastStart) {
        // Try to extract timestamp from log line
        const tsMatch = lastStart.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/)
        status.lastRun = tsMatch ? tsMatch[0] : lastStart.slice(0, 50)
        status.success = lastSuccess
      }
    }

    return reply.send(status)
  })

  app.post('/api/backup/trigger', async (_req, reply) => {
    // Backup requires root on host — not executable from container
    return reply.status(503).send({
      ok: false,
      message: 'Manual backup trigger not supported — backup.sh requires root on host. Run: sudo /home/adrianzinko/scripts/backup.sh',
    })
  })
}
