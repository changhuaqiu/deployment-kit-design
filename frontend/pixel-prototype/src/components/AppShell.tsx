import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Building2, Grid3x3, RotateCcw, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeployStore, type EnvName } from '@/store/deployStore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

const envs: { key: EnvName; label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }[] = [
  { key: 'dev', label: '沙盘城', tone: 'info' },
  { key: 'stage', label: '预演城', tone: 'warn' },
  { key: 'prod', label: '主城', tone: 'bad' },
]

export default function AppShell({
  title,
  right,
  children,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const envFocus = useDeployStore((s) => s.envFocus)
  const setEnvFocus = useDeployStore((s) => s.setEnvFocus)
  const resetDemoData = useDeployStore((s) => s.resetDemoData)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b-2 border-[var(--px-border)] bg-[rgba(11,16,32,0.88)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel)] shadow-[2px_2px_0_rgba(0,0,0,0.6)]">
              <Building2 className="h-5 w-5 text-[var(--px-accent)]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">像素城市交付局</div>
              <div className="text-xs text-[var(--px-muted)]">CityOps · IaC Delivery Playground</div>
            </div>
          </div>

          <div className="ml-2 flex items-center gap-2">
            <Link
              to="/map"
              className={cn(
                'px-btn h-10',
                location.pathname.startsWith('/map') && 'px-btn-primary'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
              施工地图
            </Link>

            <Link
              to={`/districts/${envFocus}`}
              className={cn(
                'px-btn h-10',
                location.pathname.startsWith('/districts') && 'px-btn-primary'
              )}
            >
              <Building2 className="h-4 w-4" />
              街区视图
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <Shield className="h-4 w-4 text-[var(--px-muted)]" />
              <div className="flex items-center gap-2">
                {envs.map((e) => (
                  <button
                    key={e.key}
                    onClick={() => setEnvFocus(e.key)}
                    className={cn(
                      'rounded-md border-2 px-2 py-1 text-xs font-semibold transition',
                      'border-[var(--px-border)] bg-[var(--px-panel)] hover:bg-[color-mix(in_oklab,var(--px-panel)_80%,white_8%)]',
                      envFocus === e.key && 'outline outline-2 outline-[var(--px-info)]'
                    )}
                  >
                    <Badge tone={e.tone}>{e.label}</Badge>
                  </button>
                ))}
              </div>
            </div>

            {right}

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  resetDemoData()
                  navigate('/map')
                }}
                className="h-10"
              >
                <RotateCcw className="h-4 w-4" />
                重置演示
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-base font-semibold">{title}</div>
        </div>
        {children}
      </main>
    </div>
  )
}

