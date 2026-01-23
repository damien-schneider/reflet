import { ChatCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SupportUnavailableProps {
  orgSlug: string;
}

export function SupportUnavailable({ orgSlug }: SupportUnavailableProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ChatCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Support unavailable</h3>
          <p className="text-center text-muted-foreground">
            Support messaging is not enabled for this organization.
          </p>
          <Link className="mt-4" href={`/${orgSlug}`}>
            <Button variant="outline">Go back</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
