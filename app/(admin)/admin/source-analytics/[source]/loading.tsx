import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SourceDetailLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-7 w-48" />
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border">
        <div className="p-4 space-y-4">
          <div className="flex gap-4 border-b pb-3">
            <Skeleton className="h-4 w-[30%]" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[15%]" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-2">
              <Skeleton className="h-4 w-[30%]" />
              <Skeleton className="h-4 w-[20%]" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-[15%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
