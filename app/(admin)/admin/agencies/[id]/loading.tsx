import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgencyDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-9 w-20" />
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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

      <Card>
        <CardHeader><Skeleton className="h-4 w-28" /></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><Skeleton className="h-4 w-36" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-2">
              <Skeleton className="h-4 w-[25%]" />
              <Skeleton className="h-4 w-[15%]" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-[10%]" />
              <Skeleton className="h-4 w-[10%]" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
