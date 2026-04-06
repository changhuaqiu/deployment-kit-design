import { useMemo, useState } from 'react'
import { CheckCircle2, MessageSquarePlus, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeployChange } from '@/store/deployStore'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import { formatRelativeTime } from '@/utils/format'

export default function ReviewPanel({
  change,
  currentUser,
  onAddComment,
  onApprove,
  onReject,
}: {
  change: DeployChange
  currentUser: string
  onAddComment: (body: string) => void
  onApprove: () => void
  onReject: () => void
}) {
  const [body, setBody] = useState('')
  const canApprove = change.status === 'in_review'
  const canReject = change.status === 'in_review'

  const sorted = useMemo(() => [...change.comments].sort((a, b) => a.createdAt - b.createdAt), [change.comments])

  return (
    <div className="px-panel h-full p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">评审区</div>
        <div className="flex items-center gap-2">
          <Button variant="primary" disabled={!canApprove} onClick={onApprove}>
            <CheckCircle2 className="h-4 w-4" /> 通过
          </Button>
          <Button variant="danger" disabled={!canReject} onClick={onReject}>
            <XCircle className="h-4 w-4" /> 退回
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-[var(--px-muted)]">
        原型：评论模拟评审；只有完成 IaC 工坊并进入“待审”状态，才可通过/退回。
      </div>

      <div className="mt-3 space-y-2 overflow-auto pr-1" style={{ height: 360 }}>
        {sorted.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-[var(--px-border)] bg-[rgba(0,0,0,0.12)] p-4 text-sm text-[var(--px-muted)]">
            暂无评论，先写下你的风险点或回滚策略。
          </div>
        ) : null}

        {sorted.map((c) => {
          const mine = c.author === currentUser
          return (
            <div
              key={c.id}
              className={cn(
                'rounded-lg border-2 bg-[var(--px-panel-2)] p-3',
                mine ? 'border-[var(--px-info)]' : 'border-[var(--px-border)]'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-xs font-semibold">{c.author}</div>
                <div className="text-[11px] text-[var(--px-muted)]">{formatRelativeTime(c.createdAt)}</div>
              </div>
              <div className="mt-2 text-sm leading-6">{c.body}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-lg border-2 border-[var(--px-border)] bg-[var(--px-panel-2)] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--px-muted)]">
          <MessageSquarePlus className="h-4 w-4" /> 新评论
        </div>
        <div className="mt-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="例如：删除资源需要确认依赖；权限扩大需要说明范围…" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--px-muted)]">
            <Badge tone={change.status === 'approved' ? 'good' : 'warn'}>
              {change.status === 'approved' ? '已解锁执行' : '通过后解锁执行'}
            </Badge>
          </div>
          <Button
            variant="primary"
            disabled={!body.trim()}
            onClick={() => {
              onAddComment(body.trim())
              setBody('')
            }}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}

