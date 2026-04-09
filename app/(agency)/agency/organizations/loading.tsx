import { Skeleton } from "@/components/ui/skeleton";

export default function AgencyOrganizationsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-52 mt-1" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="p-4 space-y-4">
          <div className="flex gap-4 border-b pb-3">
            <Skeleton className="h-4 w-[30%]" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[10%]" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-2">
              <Skeleton className="h-4 w-[30%]" />
              <Skeleton className="h-4 w-[20%]" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-[15%]" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
