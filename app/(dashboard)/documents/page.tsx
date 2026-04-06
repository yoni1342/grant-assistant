import { getDocuments } from "./actions"
import { DocumentTable } from "./components/document-table"
import { UploadDialog } from "./components/upload-dialog"

export default async function DocumentsPage() {
  const { data: documents } = await getDocuments()

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Documents</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-wide uppercase">
            Manage your organization&apos;s document vault
          </p>
        </div>
        <UploadDialog />
      </div>

      {/* Document Table */}
      <DocumentTable initialData={documents} />
    </div>
  )
}
