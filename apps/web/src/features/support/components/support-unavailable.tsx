import { ChatCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H3, Muted } from "@/components/ui/typography";

interface SupportUnavailableProps {
  backHref: string;
}

export function SupportUnavailable({ backHref }: SupportUnavailableProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ChatCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <H3>Support unavailable</H3>
          <Muted className="text-center">
            Support messaging is not enabled for this organization.
          </Muted>
          <Link className="mt-4" href={backHref}>
            <Button variant="outline">Go back</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
