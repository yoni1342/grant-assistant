import { getDocuments } from "./actions"
import { DocumentTable } from "./components/document-table"
import { UploadDialog } from "./components/upload-dialog"

export default async function DocumentsPage() {
  const { data: documents } = await getDocuments()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization's document vault
          </p>
        </div>
        <UploadDialog />
      </div>

      {/* Document Table */}
      <DocumentTable initialData={documents} />
    </div>
  )
}
