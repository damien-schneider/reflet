import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto mt-2 h-5 w-96" />
      </div>
      <Skeleton className="mx-auto h-96 max-w-2xl" />
    </div>
  );
}
