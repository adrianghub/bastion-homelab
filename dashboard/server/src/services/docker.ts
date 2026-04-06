import Dockerode from 'dockerode'
import { PassThrough } from 'node:stream'

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' })

export interface ContainerInfo {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: string[]
  created: number
}

export async function listContainers(): Promise<ContainerInfo[]> {
  const containers = await docker.listContainers({ all: true })
  return containers.map((c) => ({
    id: c.Id,
    name: c.Names[0]?.replace(/^\//, '') ?? c.Id.slice(0, 12),
    image: c.Image,
    state: c.State,
    status: c.Status,
    ports: c.Ports.map((p) =>
      p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}/${p.Type}` : `${p.PrivatePort}/${p.Type}`
    ),
    created: c.Created,
  }))
}

export async function containerAction(id: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  const container = docker.getContainer(id)
  if (action === 'start') await container.start({})
  else if (action === 'stop') await container.stop()
  else await container.restart()
}

export async function streamContainerLogs(
  name: string,
  lines: number,
  onData: (line: string) => void,
  onEnd: () => void
): Promise<() => void> {
  // Find container by name
  const all = await docker.listContainers({ all: true })
  const info = all.find((c) => c.Names.some((n) => n.replace(/^\//, '') === name))
  if (!info) {
    onData(`[error] container not found: ${name}`)
    onEnd()
    return () => {}
  }

  const container = docker.getContainer(info.Id)
  const logStream = await container.logs({
    stdout: true,
    stderr: true,
    follow: true,
    tail: lines,
    timestamps: true,
  })

  // Docker multiplexes stdout/stderr — use PassThrough streams to demux
  const stdout = new PassThrough()
  const stderr = new PassThrough()

  docker.modem.demuxStream(logStream, stdout, stderr)

  const handleChunk = (chunk: Buffer) => {
    chunk.toString().split('\n').filter(Boolean).forEach(onData)
  }

  stdout.on('data', handleChunk)
  stderr.on('data', handleChunk)
  logStream.on('end', onEnd)

  return () => {
    stdout.destroy()
    stderr.destroy()
  }
}
