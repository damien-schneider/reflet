"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { LogOut, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function AccountPage() {
  const user = useQuery(api.auth.getCurrentUser);

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-semibold text-2xl">Account</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{user?.name ?? "User"}</p>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Mail className="h-3 w-3" />
                <span>{user?.email ?? ""}</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
