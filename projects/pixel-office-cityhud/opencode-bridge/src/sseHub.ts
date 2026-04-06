type SseWritable = {
  write: (chunk: string) => void
}

export function createSseHub() {
  const clients = new Set<SseWritable>()

  return {
    addClient(client: SseWritable) {
      clients.add(client)
      return () => clients.delete(client)
    },
    broadcast(event: unknown) {
      const payload = `data: ${JSON.stringify(event)}\n\n`
      clients.forEach((client) => client.write(payload))
    },
    size() {
      return clients.size
    },
  }
}
