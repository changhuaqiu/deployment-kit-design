import Drawer from '@/components/ui/Drawer'
import { useDeployStore } from '@/store/deployStore'

export default function AgentLedgerDrawer({ open, onClose }: { open: boolean, onClose: () => void }) {
  const ledger = useDeployStore(s => s.ledger)

  return (
    <Drawer open={open} onClose={onClose} title="📜 工程台账 (Beads Ledger)">
      <div className="flex flex-col gap-3 p-4">
        {ledger.length === 0 ? (
          <div className="text-sm text-[var(--px-muted)]">暂无施工记录。</div>
        ) : (
          ledger.map(entry => (
            <div key={entry.id} className="text-xs font-mono border-b border-[var(--px-border)] pb-2">
              <span className="text-[var(--px-muted)]">
                [{new Date(entry.timestamp).toLocaleTimeString()}]
              </span>
              <span className="ml-2 font-bold">{entry.agentName}:</span>
              <span className={`ml-2 ${
                entry.type === 'error' ? 'text-red-400' :
                entry.type === 'warn' ? 'text-yellow-400' :
                entry.type === 'success' ? 'text-green-400' : 'text-[var(--px-text)]'
              }`}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </Drawer>
  )
}