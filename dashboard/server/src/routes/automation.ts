import type { FastifyInstance } from 'fastify'
import { authHook } from '../auth.js'

interface AutomationJob {
  name: string
  schedule: string
  description: string
  mechanism: string
  status: 'ok' | 'warning' | 'unknown'
  warning?: string
}

const JOBS: AutomationJob[] = [
  {
    name: 'Watchtower',
    schedule: 'Daily 04:00',
    description: 'Auto-update registry-based container images',
    mechanism: 'Watchtower container (--label-enable)',
    status: 'ok',
  },
  {
    name: 'Custom image rebuild',
    schedule: 'Daily 04:30',
    description: 'Rebuild n8n-custom, nextcloud-custom, htop-web-custom when base images change',
    mechanism: 'systemd bastion-custom-rebuild.timer',
    status: 'ok',
  },
  {
    name: 'Backup → B2',
    schedule: '1st & 15th of month, 03:00',
    description: 'Full INFRA + APPS archive encrypted and uploaded to Backblaze B2',
    mechanism: 'crontab → backup.sh',
    status: 'warning',
    warning: 'B2 storage cap hit 2026-01-15. Verify bucket free space.',
  },
  {
    name: 'Cert renewal',
    schedule: '1st of month (bi-monthly), 04:00',
    description: 'Renew wildcard *.bastionreda.online via Certbot DNS-01/Cloudflare',
    mechanism: 'crontab → certbot renew',
    status: 'warning',
    warning: 'Runs bi-monthly but certs expire in 90 days — one missed run leaves ~30 day buffer. Consider monthly.',
  },
  {
    name: 'Nextcloud cron',
    schedule: 'Every 5 minutes',
    description: 'Nextcloud background jobs (php cron.php)',
    mechanism: 'crontab',
    status: 'ok',
  },
  {
    name: 'Docker prune',
    schedule: 'Sunday 05:00',
    description: 'docker system prune -a -f --volumes',
    mechanism: 'crontab',
    status: 'warning',
    warning: 'DANGEROUS: --volumes flag can delete all unused volumes. Remove --volumes from cron entry.',
  },
]

export async function automationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/automation', async (_req, reply) => {
    return reply.send(JOBS)
  })
}
