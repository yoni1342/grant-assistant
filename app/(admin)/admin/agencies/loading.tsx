import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAgenciesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>

      <Skeleton className="h-9 w-64" />

      <div className="rounded-lg border">
        <div className="p-4 space-y-4">
          <div className="flex gap-4 border-b pb-3">
            <Skeleton className="h-4 w-[25%]" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[12%]" />
            <Skeleton className="h-4 w-[10%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[8%]" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-2">
              <Skeleton className="h-4 w-[25%]" />
              <Skeleton className="h-4 w-[20%]" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-[10%]" />
              <Skeleton className="h-4 w-[15%]" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
