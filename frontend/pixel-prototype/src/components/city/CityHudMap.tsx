import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { EnvName, InventoryItem, ResourceChange } from '@/store/deployStore'
import { useDeployStore, mockOpenCodeApi } from '@/store/deployStore'
import AgentOfficePanel from './AgentOfficePanel'
import AgentLedgerDrawer from './AgentLedgerDrawer'
import { buildingLabel, districtForInventory, districtForResource, districtMeta, type DistrictKey } from '@/utils/city'
import { computeCostDelta, computeRiskScore } from '@/utils/risk'

type CityBuilding = {
  id: string
  x: number
  y: number
  district: DistrictKey
  icon: string
  title: string
  resourceKey: string
  status: 'normal' | 'drift' | 'building'
  target:
    | { kind: 'resource'; changeId: string; resourceId: string }
    | { kind: 'inventory'; changeId: string; inventoryId: string }
  costMonthlyUsd: number
}

type DistrictRect = { key: DistrictKey; x: number; y: number; w: number; h: number }

function hashInt(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function findOpenSpot(occupied: Set<string>, rect: DistrictRect, seed: number) {
  const stride = 2
  const maxX = rect.x + rect.w - 2
  const maxY = rect.y + rect.h - 2
  let x = rect.x + 1 + ((seed % Math.max(1, rect.w - 2)) & ~1)
  let y = rect.y + 1 + (((seed >>> 6) % Math.max(1, rect.h - 2)) & ~1)

  for (let i = 0; i < 256; i++) {
    const key = `${x},${y}`
    if (!occupied.has(key)) {
      occupied.add(key)
      return { x, y }
    }
    x += stride
    if (x > maxX) {
      x = rect.x + 1
      y += stride
      if (y > maxY) y = rect.y + 1
    }
  }

  const fallback = `${rect.x + 1},${rect.y + 1}`
  occupied.add(fallback)
  return { x: rect.x + 1, y: rect.y + 1 }
}

function toUsd(v: number) {
  return Math.round(v * 100) / 100
}

export default function CityHudMap({ env }: { env: EnvName }) {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)

  const changes = useDeployStore((s) => s.changes)
  const resetDemoData = useDeployStore((s) => s.resetDemoData)
  const runWorkshopScan = useDeployStore((s) => s.runWorkshopScan)
  const runWorkshopGenerate = useDeployStore((s) => s.runWorkshopGenerate)
  const dispatchAgents = useDeployStore((s) => s.dispatchAgents)
  const projectionEvents = useDeployStore((s) => s.projectionEvents)
  const gcProjectionEvents = useDeployStore((s) => s.gcProjectionEvents)
  const projectScan = useDeployStore((s) => s.projectScan)
  const projectGenerate = useDeployStore((s) => s.projectGenerate)

  const cityChanges = useMemo(() => changes.filter((c) => c.env === env), [changes, env])

  const [selectedDistrict] = useState<DistrictKey | 'all'>('all')
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [ledgerOpen, setLedgerOpen] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 120, y: 80 })
  const draggingRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
  })

  const grid = useMemo(() => ({ tile: 32, w: 56, h: 34 }), [])

  const districts = useMemo<DistrictRect[]>(
    () => [
      { key: 'business', x: 2, y: 2, w: 18, h: 12 },
      { key: 'data', x: 22, y: 2, w: 18, h: 12 },
      { key: 'network', x: 42, y: 2, w: 12, h: 12 },
      { key: 'security', x: 2, y: 16, w: 16, h: 16 },
      { key: 'ops', x: 20, y: 16, w: 16, h: 16 },
      { key: 'config', x: 38, y: 16, w: 16, h: 16 },
    ],
    []
  )

  const derivedBuildings = useMemo(() => {
    const occupied = new Set<string>()
    const items: CityBuilding[] = []

    const rectOf = (d: DistrictKey) => districts.find((x) => x.key === d) ?? districts[0]

    for (const ch of cityChanges) {
      for (const r of ch.resources) {
        const district = districtForResource(r)
        const rect = rectOf(district)
        const { x, y } = findOpenSpot(occupied, rect, hashInt(`${ch.id}:${r.id}`))
        const status: CityBuilding['status'] = r.action === 'delete' ? 'drift' : ch.status === 'running' ? 'building' : 'normal'
        const icon = district === 'data' ? '🏦' : district === 'network' ? '🌐' : district === 'security' ? '🛡️' : district === 'ops' ? '📡' : district === 'config' ? '🗄️' : '🏢'
        items.push({
          id: `res_${ch.id}_${r.id}`,
          x,
          y,
          district,
          icon,
          title: `${r.type}.${r.name}`,
          resourceKey: `${r.type}.${r.name}`,
          status,
          target: { kind: 'resource', changeId: ch.id, resourceId: r.id },
          costMonthlyUsd: toUsd(r.costDeltaMonthlyUsd),
        })
      }

      for (const inv of ch.workshop.inventory) {
        const district = districtForInventory(inv)
        const rect = rectOf(district)
        const { x, y } = findOpenSpot(occupied, rect, hashInt(`${ch.id}:${inv.id}`))
        const status: CityBuilding['status'] = inv.drift === 'none' ? 'normal' : 'drift'
        const icon = district === 'data' ? '🏪' : district === 'network' ? '🛣️' : district === 'security' ? '🛡️' : district === 'ops' ? '📡' : district === 'config' ? '🗄️' : '🏢'
        items.push({
          id: `inv_${ch.id}_${inv.id}`,
          x,
          y,
          district,
          icon,
          title: `${inv.type}.${inv.name}`,
          resourceKey: `${inv.type}.${inv.name}`,
          status,
          target: { kind: 'inventory', changeId: ch.id, inventoryId: inv.id },
          costMonthlyUsd: 0,
        })
      }
    }

    return items
  }, [cityChanges, districts])

  const buildings = useMemo(() => {
    const all = [...derivedBuildings]
    if (selectedDistrict === 'all') return all
    return all.filter((b) => b.district === selectedDistrict)
  }, [derivedBuildings, selectedDistrict])

  const selected = useMemo(() => {
    if (!selectedBuildingId) return null
    return buildings.find((b) => b.id === selectedBuildingId) ?? null
  }, [buildings, selectedBuildingId])

  const selectedChange = useMemo(() => {
    if (!selected) return null
    const t = selected.target
    return cityChanges.find((c) => c.id === t.changeId) ?? null
  }, [cityChanges, selected])

  const selectedResource = useMemo<ResourceChange | null>(() => {
    if (!selected) return null
    const t = selected.target
    if (t.kind !== 'resource') return null
    const ch = cityChanges.find((c) => c.id === t.changeId)
    return ch?.resources.find((r) => r.id === t.resourceId) ?? null
  }, [cityChanges, selected])

  const selectedInventory = useMemo<InventoryItem | null>(() => {
    if (!selected) return null
    const t = selected.target
    if (t.kind !== 'inventory') return null
    const ch = cityChanges.find((c) => c.id === t.changeId)
    return ch?.workshop.inventory.find((i) => i.id === t.inventoryId) ?? null
  }, [cityChanges, selected])

  const kpi = useMemo(() => {
    const drift = derivedBuildings.filter((b) => b.status === 'drift').length
    const cost = cityChanges.reduce((acc, c) => acc + computeCostDelta(c), 0)
    const risk = cityChanges.length ? Math.round(cityChanges.reduce((acc, c) => acc + computeRiskScore(c).score, 0) / cityChanges.length) : 0
    return { buildings: derivedBuildings.length, drift, cost: toUsd(cost), risk }
  }, [cityChanges, derivedBuildings])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const resize = () => {
      const rect = host.getBoundingClientRect()
      canvas.width = Math.max(800, Math.floor(rect.width))
      canvas.height = Math.max(520, Math.floor(rect.height))
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => gcProjectionEvents(Date.now()), 1500)
    return () => window.clearInterval(t)
  }, [gcProjectionEvents])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0

    const draw = () => {
        const w = canvas.width
        const h = canvas.height

        ctx.clearRect(0, 0, w, h)

        // Dark Cyberpunk/Blueprint Background
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, w, h)

        // Add a subtle vignette / glowing effect in the center
        const grad = ctx.createRadialGradient(w/2, h/2, 100, w/2, h/2, Math.max(w, h))
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.05)')
        grad.addColorStop(1, 'rgba(15, 23, 42, 1)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        ctx.save()
        ctx.translate(offset.x, offset.y)
        ctx.scale(zoom, zoom)

        const tile = grid.tile

        // Draw Grid
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'
        ctx.lineWidth = 1
        for (let x = 0; x <= grid.w; x++) {
          ctx.beginPath()
          ctx.moveTo(x * tile, 0)
          ctx.lineTo(x * tile, grid.h * tile)
          ctx.stroke()
        }
        for (let y = 0; y <= grid.h; y++) {
          ctx.beginPath()
          ctx.moveTo(0, y * tile)
          ctx.lineTo(grid.w * tile, y * tile)
          ctx.stroke()
        }

        // Draw Districts (Neon Hologram Style)
        for (const d of districts) {
          const meta = districtMeta[d.key]
          const x = d.x * tile
          const y = d.y * tile
          const rw = d.w * tile
          const rh = d.h * tile
          
          ctx.fillStyle = 'rgba(6, 182, 212, 0.03)'
          ctx.fillRect(x, y, rw, rh)

          const baseColor = meta.tone === 'bad' ? 'rgba(244,63,94,0.8)' : meta.tone === 'warn' ? 'rgba(250,204,21,0.8)' : meta.tone === 'info' ? 'rgba(56,189,248,0.8)' : 'rgba(6,182,212,0.6)'
          
          ctx.strokeStyle = baseColor
          ctx.lineWidth = 2
          // Glow effect for district border
          ctx.shadowColor = baseColor
          ctx.shadowBlur = 10
          ctx.strokeRect(x, y, rw, rh)
          ctx.shadowBlur = 0

          // District Title Header
          ctx.fillStyle = 'rgba(15,23,42,0.8)'
          ctx.fillRect(x + 4, y + 4, Math.min(200, rw - 8), 24)
          ctx.strokeStyle = baseColor
          ctx.lineWidth = 1
          ctx.strokeRect(x + 4, y + 4, Math.min(200, rw - 8), 24)

          ctx.fillStyle = baseColor
          ctx.font = '10px "Press Start 2P", ui-sans-serif'
          ctx.fillText(`[ ${meta.label} ]`, x + 10, y + 21)
        }

        const now = Date.now()
        const buildState = new Map<string, { phase: 'scaffolding' | 'complete'; at: number }>()
        for (const e of projectionEvents) {
          const k = e.target.resourceKey
          if (!k) continue
          if (e.kind === 'build_start') {
            const prev = buildState.get(k)
            if (!prev || prev.at < e.at) buildState.set(k, { phase: 'scaffolding', at: e.at })
          }
          if (e.kind === 'build_complete') {
            const prev = buildState.get(k)
            if (!prev || prev.at < e.at) buildState.set(k, { phase: 'complete', at: e.at })
          }
        }

        // Draw Buildings
        for (const b of buildings) {
          const px = b.x * tile
          const py = b.y * tile
          const size = tile * 1.2
          const r = 4

          const bs = buildState.get(b.resourceKey)
          const isUnderConstruction = bs?.phase === 'scaffolding'
          const revealAt = bs?.phase === 'complete' ? bs.at : undefined
          const fade = revealAt ? Math.min(1, Math.max(0, (now - revealAt) / 700)) : 1
          ctx.globalAlpha = fade

          // Fill
          ctx.fillStyle = 'rgba(30,41,59,0.9)'
          ctx.beginPath()
          ctx.roundRect(px, py, size, size, r)
          ctx.fill()

          // Border
          const border = b.status === 'drift' ? 'rgba(250,204,21,1)' : b.status === 'building' ? 'rgba(56,189,248,1)' : 'rgba(148,163,184,0.8)'
          ctx.strokeStyle = border
          ctx.lineWidth = 2
          
          if (b.status !== 'normal') {
            ctx.shadowColor = border
            ctx.shadowBlur = 8
          }
          
          ctx.beginPath()
          ctx.roundRect(px, py, size, size, r)
          ctx.stroke()
          ctx.shadowBlur = 0

          // Selected Outline
          if (selectedBuildingId === b.id) {
            ctx.strokeStyle = 'rgba(74,222,128,1)'
            ctx.lineWidth = 2
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.roundRect(px - 4, py - 4, size + 8, size + 8, r)
            ctx.stroke()
            ctx.setLineDash([])
          }

          if (!isUnderConstruction) {
            ctx.font = '18px "Press Start 2P", ui-sans-serif'
            ctx.fillStyle = '#f8fafc'
            ctx.fillText(b.icon, px + 10, py + 26)
          }

          if (b.status === 'drift' && !isUnderConstruction) {
            ctx.font = '12px "Press Start 2P", ui-sans-serif'
            ctx.fillStyle = '#facc15'
            ctx.fillText('⚠', px + size - 18, py + 14)
          }

          ctx.globalAlpha = 1
        }

        for (const e of projectionEvents) {
          const age = now - e.at
          const dur = e.durationMs ?? 1000
          const t = Math.max(0, Math.min(1, age / dur))
          const cx = e.target.x * tile + tile * 0.6
          const cy = e.target.y * tile + tile * 0.6

          if (e.kind === 'scan_ping') {
            const r = 8 + t * 46
            ctx.strokeStyle = `rgba(34,211,238,${0.35 * (1 - t)})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(cx, cy, r, 0, Math.PI * 2)
            ctx.stroke()
          }

          if (e.kind === 'drift_alert') {
            const pulse = 0.5 + 0.5 * Math.sin((age / 180) * Math.PI * 2)
            ctx.fillStyle = `rgba(250,204,21,${0.25 + 0.25 * pulse})`
            ctx.fillRect(cx - 14, cy - 22, 28, 10)
            ctx.fillStyle = 'rgba(250,204,21,0.9)'
            ctx.font = '10px "Press Start 2P", ui-sans-serif'
            ctx.fillText('⚠', cx - 6, cy - 14)
          }

          if (e.kind === 'build_start') {
            ctx.strokeStyle = 'rgba(56,189,248,0.85)'
            ctx.lineWidth = 2
            ctx.setLineDash([3, 3])
            ctx.strokeRect(cx - 18, cy - 18, 36, 36)
            ctx.setLineDash([])
            ctx.fillStyle = 'rgba(56,189,248,0.15)'
            ctx.fillRect(cx - 18, cy + 22, 36, 4)
            ctx.fillStyle = 'rgba(56,189,248,0.9)'
            ctx.fillRect(cx - 18, cy + 22, 36 * t, 4)
          }

          if (e.kind === 'build_complete') {
            for (let i = 0; i < 10; i++) {
              const a = (i / 10) * Math.PI * 2
              const rr = 6 + t * 18
              const px = cx + Math.cos(a) * rr
              const py = cy + Math.sin(a) * rr
              ctx.fillStyle = `rgba(74,222,128,${0.6 * (1 - t)})`
              ctx.fillRect(px, py, 2, 2)
            }
          }
        }

      ctx.restore()

      raf = window.requestAnimationFrame(draw)
    }

    raf = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(raf)
  }, [buildings, districts, grid, offset.x, offset.y, projectionEvents, selectedBuildingId, zoom])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const wx = (x - offset.x) / zoom
      const wy = (y - offset.y) / zoom
      return { wx, wy }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      draggingRef.current.dragging = true
      draggingRef.current.lastX = e.clientX
      draggingRef.current.lastY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current.dragging) return
      const dx = e.clientX - draggingRef.current.lastX
      const dy = e.clientY - draggingRef.current.lastY
      draggingRef.current.lastX = e.clientX
      draggingRef.current.lastY = e.clientY
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!draggingRef.current.dragging) return
      draggingRef.current.dragging = false

      const moved = Math.abs(e.clientX - draggingRef.current.lastX) + Math.abs(e.clientY - draggingRef.current.lastY)
      if (moved > 6) return

      const { wx, wy } = toWorld(e.clientX, e.clientY)
      const tile = grid.tile

      const hit = buildings
        .slice()
        .reverse()
        .find((b) => {
          const size = tile * 1.2
          const px = b.x * tile
          const py = b.y * tile
          return wx >= px && wx <= px + size && wy >= py && wy <= py + size
        })

      if (hit) {
        setSelectedBuildingId(hit.id)
      } else {
        setSelectedBuildingId(null)
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((z) => Math.max(0.6, Math.min(2.0, z * delta)))
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [buildings, districts, grid.tile, offset.x, offset.y, zoom])

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-[var(--px-bg)]" ref={hostRef}>
      {/* Map Area (60%) */}
      <div className="relative flex-[3] h-full overflow-hidden border-r-[4px] border-[var(--px-border)] shadow-[4px_0_15px_rgba(0,0,0,0.5)] z-10">
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Top KPI Bar */}
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 px-panel flex items-center gap-6 px-6 py-2.5 bg-[var(--px-panel)]/90 backdrop-blur border-b-4 border-[var(--px-border)] shadow-xl">
          <div className="text-[10px] text-[var(--px-text)] font-bold tracking-wider">
            🏗 BUILDINGS <span className="text-[var(--px-info)] ml-1 text-[12px]">{kpi.buildings}</span>
          </div>
          <div className="text-[10px] text-[var(--px-text)] font-bold tracking-wider">
            ⚠ DRIFT <span className="text-[var(--px-warn)] ml-1 text-[12px]">{kpi.drift}</span>
          </div>
          <div className="text-[10px] text-[var(--px-text)] font-bold tracking-wider">
            💰 COST <span className="text-green-400 ml-1 text-[12px]">${kpi.cost}/mo</span>
          </div>
          <div className="text-[10px] text-[var(--px-text)] font-bold tracking-wider">
            🚧 RISK <span className="text-red-400 ml-1 text-[12px]">{kpi.risk}</span>
          </div>
        </div>

        {/* Selected Building Info Panel (Moved to bottom left) */}
        <div className="absolute left-4 bottom-20 z-30 w-[300px]">
          {selected && (
            <div className="px-panel p-3 shadow-xl bg-[var(--px-panel)]/95 backdrop-blur border-l-[4px] border-[var(--px-info)]">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-[var(--px-info)]">{selected.title}</div>
                    <div className="mt-1 text-[10px] text-[var(--px-muted)]">{buildingLabel(selectedResource?.type ?? selectedInventory?.type ?? '')}</div>
                  </div>
                  <Badge tone={selected.status === 'drift' ? 'warn' : selected.status === 'building' ? 'info' : 'neutral'}>
                    {selected.status === 'drift' ? '漂移' : selected.status === 'building' ? '施工中' : '正常'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded border border-[var(--px-border)] bg-[var(--px-panel-2)]/50 p-2">
                    <div className="text-[9px] font-bold text-[var(--px-muted)]">COST</div>
                    <div className="mt-1 text-[11px] font-mono text-green-400">${selected.costMonthlyUsd}/mo</div>
                  </div>
                  <div className="rounded border border-[var(--px-border)] bg-[var(--px-panel-2)]/50 p-2">
                    <div className="text-[9px] font-bold text-[var(--px-muted)]">DISTRICT</div>
                    <div className="mt-1">
                      <Badge tone={districtMeta[selected.district].tone}>{districtMeta[selected.district].label}</Badge>
                    </div>
                  </div>
                </div>

                {selectedChange ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button className="h-7 text-[9px] px-2" onClick={() => navigate(`/workshop/${selectedChange.id}`)}>规划局</Button>
                    <Button className="h-7 text-[9px] px-2" onClick={() => navigate(`/changes/${selectedChange.id}`)}>审批大厅</Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 px-panel flex items-center gap-3 px-5 py-2.5 bg-[var(--px-panel)]/95 backdrop-blur border-t-4 border-[var(--px-border)] shadow-xl">
          <button
            className="px-btn h-9 px-4 text-[11px] bg-blue-900/40 hover:bg-blue-800/60 border-blue-500/50"
            onClick={() => {
              if (selectedChange) {
                mockOpenCodeApi.fetchAgentsForTask('scan').then((subAgents) => {
                  dispatchAgents('scan', subAgents, () => {
                    runWorkshopScan(selectedChange.id)
                    projectScan(selectedChange.id)
                  })
                })
              }
            }}
          >
            <span className="mr-1">🔭</span> 智能普查
          </button>
          <button
            className="px-btn h-9 px-4 text-[11px] bg-purple-900/40 hover:bg-purple-800/60 border-purple-500/50"
            onClick={() => {
              if (selectedChange) {
                mockOpenCodeApi.fetchAgentsForTask('generate').then((subAgents) => {
                  dispatchAgents('generate', subAgents, () => {
                    runWorkshopGenerate(selectedChange.id)
                    projectGenerate(selectedChange.id)
                  })
                })
              }
            }}
          >
            <span className="mr-1">📝</span> 智能生成
          </button>
          <div className="w-px h-6 bg-[var(--px-border)] mx-1"></div>
          <button
            className="px-btn px-btn-primary h-9 px-4 text-[11px] shadow-[0_0_10px_rgba(46,204,113,0.4)]"
            onClick={() => {
              if (selectedChange) navigate(`/changes/${selectedChange.id}`)
            }}
          >
            🚀 提交审批
          </button>
          <button className="px-btn h-9 px-3 text-[10px] ml-2 opacity-70 hover:opacity-100" onClick={() => resetDemoData()}>
            ↻ 重置
          </button>
        </div>
      </div>

      {/* Dashboard Area (40%) */}
      <div className="relative flex-[2] h-full bg-[var(--px-bg)] flex flex-col z-0">
        <AgentOfficePanel onOpenLedger={() => setLedgerOpen(true)} />
      </div>

      <AgentLedgerDrawer open={ledgerOpen} onClose={() => setLedgerOpen(false)} />
    </div>
  )
}
