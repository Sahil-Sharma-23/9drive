import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FileTable } from '@/components/drive/FileTable'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { archivedFiles } from '@/data/drive-data'

export function ArchivedPage() {
  return (
    <>
      <PageHeader title="Archived" description="Older files kept out of active workspace." actions={<><Button variant="outline" disabled title="Coming soon"><RotateCcw className="h-4 w-4" />Restore</Button><Button variant="danger" disabled title="Coming soon"><Trash2 className="h-4 w-4" />Delete Permanently</Button></>} />
      <Alert tone="warning" className="mt-6">Archived files stay available and do not count as active workspace clutter.</Alert>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Archived Items" value="3" icon={Archive} />
        <MetricCard label="Recoverable" value="3" icon={RotateCcw} tone="success" />
        <MetricCard label="Storage Saved" value="2.6 MB" icon={Trash2} tone="neutral" />
      </div>
      <FileTable files={archivedFiles} mode="archived" className="mt-6" />
    </>
  )
}
