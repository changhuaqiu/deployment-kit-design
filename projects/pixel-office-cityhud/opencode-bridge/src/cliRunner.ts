import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

export interface CliRunnerOptions {
  command?: string
  args?: string[]
}

export interface CliRunnerHandle {
  child: ChildProcessWithoutNullStreams
  stop: () => void
}

export function startCliRunner(options: CliRunnerOptions = {}): CliRunnerHandle {
  const command = options.command ?? process.env.OPENCODE_COMMAND ?? 'opencode'
  const args =
    options.args ??
    (process.env.OPENCODE_ARGS ? process.env.OPENCODE_ARGS.split(' ').filter(Boolean) : [])

  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  return {
    child,
    stop: () => {
      if (!child.killed) {
        child.kill()
      }
    },
  }
}
