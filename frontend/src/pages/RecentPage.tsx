import { Clock, Download, Edit3, Eye } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { FileTable } from '@/components/drive/FileTable'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { files } from '@/data/drive-data'

const activities = [
  { text: 'Opened Travel Landing Page', time: '10 minutes ago', icon: Eye },
  { text: 'Edited Campaign Assets', time: '1 hour ago', icon: Edit3 },
  { text: 'Downloaded Wedding Video', time: 'Yesterday', icon: Download },
]

export function RecentPage() {
  return (
    <>
      <PageHeader title="Recent" description="Latest opened and modified files." />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Opened Today" value="8" icon={Eye} />
        <MetricCard label="Modified" value="4" icon={Edit3} />
        <MetricCard label="Downloads" value="2" icon={Download} />
      </div>
      <Card className="mt-6 p-5">
        <h2 className="text-base font-extrabold tracking-tight text-fg">Activity</h2>
        <div className="mt-4 grid gap-3">
          {activities.map((activity) => (
            <div key={activity.text} className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3">
              <IconTile icon={activity.icon} size="sm" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-fg">{activity.text}</p><p className="text-sm text-fg-muted">{activity.time}</p></div>
              <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
            </div>
          ))}
        </div>
      </Card>
      <FileTable files={files} mode="recent" className="mt-6" />
    </>
  )
}
