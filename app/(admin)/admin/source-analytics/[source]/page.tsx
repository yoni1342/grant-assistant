import { SourceDetailClient } from "./source-detail-client";

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  const { source } = await params;

  return (
    <div className="p-6">
      <SourceDetailClient source={decodeURIComponent(source)} />
    </div>
  );
}
