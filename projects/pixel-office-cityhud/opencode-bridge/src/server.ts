import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { startCliRunner, type CliRunnerHandle } from './cliRunner'
import { mapRawEvent } from './eventMapper'
import { parseJsonLine } from './rawParser'
import { createSseHub } from './sseHub'

const PORT = Number(process.env.OPENCODE_BRIDGE_PORT ?? 8787)
const hub = createSseHub()

let runner: CliRunnerHandle | null = null
let cliConnected = false
let lastError: string | null = null

function writeJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  })
  res.end(JSON.stringify(body))
}

function connectCli() {
  if (runner) {
    return
  }

  try {
    runner = startCliRunner()
    cliConnected = true
    lastError = null

    hub.broadcast({
      id: `bridge:${Date.now()}:session-start`,
      type: 'session.started',
      timestamp: Date.now(),
      sessionId: 'bridge',
      payload: { source: 'opencode-bridge' },
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''

    const flushLines = (chunk: string, kind: 'stdout' | 'stderr') => {
      const buffer = kind === 'stdout' ? stdoutBuffer + chunk : stderrBuffer + chunk
      const lines = buffer.split(/\r?\n/)
      const rest = lines.pop() ?? ''

      for (const line of lines) {
        const raw = parseJsonLine(line)
        if (!raw) continue
        const envelope = mapRawEvent(raw)
        if (!envelope) continue
        hub.broadcast(envelope)
      }

      if (kind === 'stdout') {
        stdoutBuffer = rest
      } else {
        stderrBuffer = rest
      }
    }

    runner.child.stdout.on('data', (chunk) => flushLines(String(chunk), 'stdout'))

    runner.child.stderr.on('data', (chunk) => {
      const text = String(chunk)
      flushLines(text, 'stderr')
      lastError = text.trim() || 'OpenCode stderr'
      hub.broadcast({
        id: `bridge-error:${Date.now()}`,
        type: 'error',
        timestamp: Date.now(),
        sessionId: 'unknown',
        payload: { message: text },
      })
    })

    runner.child.on('exit', (code, signal) => {
      cliConnected = false
      hub.broadcast({
        id: `bridge:${Date.now()}:session-end`,
        type: 'session.ended',
        timestamp: Date.now(),
        sessionId: 'bridge',
        payload: { code, signal },
      })
      runner = null
    })
  } catch (error) {
    cliConnected = false
    lastError = error instanceof Error ? error.message : 'Failed to start CLI'
  }
}

function handleSse(_req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'access-control-allow-origin': '*',
  })

  res.write(`data: ${JSON.stringify({ type: 'bridge.ready', timestamp: Date.now() })}\n\n`)
  const remove = hub.addClient(res)

  _req.on('close', () => {
    remove()
  })
}

function ingestJsonLines(body: string) {
  const lines = body.split(/\r?\n/)
  for (const line of lines) {
    const raw = parseJsonLine(line)
    if (!raw) continue
    const envelope = mapRawEvent(raw)
    if (!envelope) continue
    hub.broadcast(envelope)
  }
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    res.end()
    return
  }

  if (req.url === '/health') {
    writeJson(res, 200, {
      ok: true,
      cliConnected,
      clients: hub.size(),
      lastError,
      deployKitIngestEnabled: true,
    })
    return
  }

  if (req.url === '/runtime/events') {
    handleSse(req, res)
    return
  }

  if (req.url === '/deploykit/events') {
    handleSse(req, res)
    return
  }

  if (req.url === '/runtime/connect' && req.method === 'POST') {
    connectCli()
    writeJson(res, 200, { ok: true, cliConnected, lastError })
    return
  }

  if (req.url === '/deploykit/ingest' && req.method === 'POST') {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      ingestJsonLines(body)
      writeJson(res, 200, { ok: true, ingested: true })
    })
    return
  }

  writeJson(res, 404, { ok: false, message: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`OpenCode bridge listening on http://localhost:${PORT}`)
})

if (process.env.OPENCODE_AUTOSTART === '1') {
  connectCli()
}
