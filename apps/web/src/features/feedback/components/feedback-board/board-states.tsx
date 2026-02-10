import { Globe } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export function LoadingState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-4 py-8">
      <Spinner aria-label="Loading" className="size-8 text-muted-foreground" />
    </div>
  );
}

export function PrivateOrgMessage() {
  return (
    <div className="px-4 py-8">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Private organization</h3>
          <p className="text-muted-foreground">
            This organization&apos;s feedback is not publicly accessible.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
