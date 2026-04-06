import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { config } from './config.js'
import { containersRoutes } from './routes/containers.js'
import { systemRoutes } from './routes/system.js'
import { logsRoutes } from './routes/logs.js'
import { backupRoutes } from './routes/backup.js'
import { automationRoutes } from './routes/automation.js'
import { actionsRoutes } from './routes/actions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
})

await app.register(cors, {
  origin: config.nodeEnv === 'development' ? true : false,
})

// API routes
await app.register(containersRoutes)
await app.register(systemRoutes)
await app.register(logsRoutes)
await app.register(backupRoutes)
await app.register(automationRoutes)
await app.register(actionsRoutes)

// Serve static frontend (production only)
const publicDir = join(__dirname, '../public')
if (existsSync(publicDir)) {
  await app.register(staticPlugin, {
    root: publicDir,
    prefix: '/',
  })

  // SPA fallback — serve index.html for all non-API routes
  app.setNotFoundHandler(async (_req, reply) => {
    return reply.sendFile('index.html')
  })
} else {
  app.log.info('No ./public directory — static serving disabled (dev mode)')
}

await app.listen({ port: config.port, host: '0.0.0.0' })
console.log(`Bastion Dashboard API running on :${config.port}`)
