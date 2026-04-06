import { FileDiff, FolderTree, ScrollText } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Textarea from '@/components/ui/Textarea'
import type { DeployChange, IaCFileChange } from '@/store/deployStore'

function fileTone(change: IaCFileChange) {
  if (change === 'add') return 'good' as const
  if (change === 'delete') return 'bad' as const
  return 'warn' as const
}

export default function ArtifactPanel({ change }: { change: DeployChange }) {
  const artifact = change.workshop.artifact
  const isPatch = artifact?.kind === 'patch'
  const preview = artifact
    ? isPatch
        ? `diff --git a/modules/core/main.tf b/modules/core/main.tf\n@@\n- old_policy = true\n+ old_policy = false\n\n# 现网 drift 修复（模拟）\n`
        : `module "core" {\n  source = "../modules/core"\n  env = "${change.env}"\n}\n\n# IaC 工程骨架（模拟）\n`
    : ''

  return (
    <div className="px-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">IaC 输出</div>
        {artifact ? (
          <Badge tone={artifact.kind === 'patch' ? 'warn' : 'neutral'}>
            {artifact.kind === 'patch' ? (
              <FileDiff className="h-3 w-3" />
            ) : (
              <FolderTree className="h-3 w-3" />
            )}
            {artifact.kind}
          </Badge>
        ) : (
          <Badge tone="neutral">pending</Badge>
        )}
      </div>

      <div className="mt-2 text-xs text-[var(--px-muted)]">{artifact ? artifact.summary : '生成/同步完成后，这里会出现 IaC 工程或 patch。'}</div>

      {artifact ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            {artifact.files.map((f) => (
              <Badge key={f.path} tone={fileTone(f.change)}>
                <ScrollText className="h-3 w-3" /> {f.change}:{f.path}
              </Badge>
            ))}
          </div>
          <div className="mt-3">
            <Textarea value={preview} readOnly />
          </div>
        </div>
      ) : null}
    </div>
  )
}

