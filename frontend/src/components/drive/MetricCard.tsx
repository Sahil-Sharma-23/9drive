import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { IconTile, type IconTileTone } from '@/components/ui/icon-tile'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricCard({ label, value, icon, tone = 'accent', loading = false }: { label: string; value: string; icon: LucideIcon; tone?: IconTileTone; loading?: boolean }) {
  return (
    <Card className="@container p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">{label}</p>
          {loading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-2 whitespace-nowrap text-xl font-extrabold tabular-nums text-fg @min-[200px]:text-2xl">{value}</p>}
        </div>
        {/* The same card sits in 3- and 4-column grids, so size against the card, not the viewport */}
        <IconTile icon={icon} tone={tone} className="@max-[199px]:hidden" />
      </div>
    </Card>
  )
}
