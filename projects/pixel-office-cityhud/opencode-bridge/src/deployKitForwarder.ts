const DEFAULT_TARGET_URL = process.env.DEPLOYKIT_INGEST_URL ?? 'http://localhost:8787/deploykit/ingest'

export function normalizeJsonlPayload(input: string): string {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

export async function forwardDeployKitJsonl(input: string, targetUrl = DEFAULT_TARGET_URL) {
  const body = normalizeJsonlPayload(input)
  if (!body) {
    return { ok: true, skipped: true }
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Forward failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function main() {
  const chunks: string[] = []
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => chunks.push(String(chunk)))
  process.stdin.on('end', async () => {
    try {
      const result = await forwardDeployKitJsonl(chunks.join(''))
      process.stdout.write(`${JSON.stringify(result)}\n`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown forward error'
      process.stderr.write(`${message}\n`)
      process.exitCode = 1
    }
  })
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('deployKitForwarder.ts')) {
  void main()
}
