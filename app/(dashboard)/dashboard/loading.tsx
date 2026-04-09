import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 mt-1" />
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 min-w-0">
        {/* Pipeline overview */}
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="flex-1 h-2" />
                <Skeleton className="w-8 h-4" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card className="min-w-0">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-2 px-2 py-2">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
