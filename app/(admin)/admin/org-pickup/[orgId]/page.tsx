import { OrgPickupDetailClient } from "./org-pickup-detail-client";

export default async function OrgPickupDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <div className="p-4 sm:p-6">
      <OrgPickupDetailClient orgId={orgId} />
    </div>
  );
}
