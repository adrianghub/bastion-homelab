import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { authHook } from '../auth.js'
import { streamContainerLogs } from '../services/docker.js'
import { config } from '../config.js'

const FILE_SOURCES: Record<string, string> = {
  backup: config.logPaths.backup,
  'auto-rebuild': config.logPaths.autoRebuild,
}

export async function logsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get<{ Params: { source: string }; Querystring: { lines?: string; follow?: string } }>(
    '/api/logs/:source',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { source } = req.params as { source: string }
      const { lines = '200', follow = 'true' } = req.query as { lines?: string; follow?: string }
      const lineCount = Math.min(parseInt(lines, 10) || 200, 1000)

      // SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      const send = (line: string) => {
        reply.raw.write(`data: ${line}\n\n`)
      }

      const filePath = FILE_SOURCES[source]

      if (filePath) {
        // File log
        if (!existsSync(filePath)) {
          send(`[info] Log file not found: ${filePath}`)
          reply.raw.end()
          return
        }

        const content = await readFile(filePath, 'utf8')
        const fileLines = content.split('\n').filter(Boolean)
        const tail = fileLines.slice(-lineCount)
        tail.forEach(send)

        if (follow === 'true') {
          // Tail the file using a read stream from the end — simplified polling
          let offset = content.length
          const interval = setInterval(async () => {
            try {
              const full = await readFile(filePath, 'utf8')
              const newContent = full.slice(offset)
              if (newContent) {
                offset = full.length
                newContent.split('\n').filter(Boolean).forEach(send)
              }
            } catch {
              // File may have rotated — ignore
            }
          }, 2000)

          req.raw.on('close', () => clearInterval(interval))
        } else {
          reply.raw.end()
        }
      } else {
        // Container log
        const stopStream = await streamContainerLogs(
          source,
          lineCount,
          send,
          () => reply.raw.end()
        )
        req.raw.on('close', stopStream)
      }
    }
  )
}
