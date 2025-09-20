import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimListSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-16 h-16 rounded-md" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-9 w-28" />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
