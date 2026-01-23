import { SignIn } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Lead } from "@/components/ui/typography";

export function SignInRequired() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <H1 variant="page">Contact Support</H1>
        <Lead>Get help from our team</Lead>
      </div>

      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SignIn className="h-5 w-5" />
            Sign in required
          </CardTitle>
          <CardDescription>
            Please sign in to send a message to our support team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth">
            <Button className="w-full">Sign in to continue</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
