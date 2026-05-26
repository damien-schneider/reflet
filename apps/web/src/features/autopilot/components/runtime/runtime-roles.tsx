import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  roleSkillLabel,
  STATE_BADGE,
} from "@/features/autopilot/components/runtime/runtime-formatting";
import type { RuntimeRole } from "@/features/autopilot/components/runtime/runtime-types";

export function RuntimeRoles({ roles }: { roles: RuntimeRole[] }) {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {roles.map((role) => (
        <Card key={role.role}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {roleSkillLabel(role.role)}
                </CardTitle>
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.skills.map((skill) => (
                    <Badge key={`${role.role}-${skill}`} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <Badge variant={STATE_BADGE[role.state]}>{role.state}</Badge>
            </div>
          </CardHeader>
          {role.blockers.length > 0 && (
            <CardContent className="space-y-1">
              {role.blockers.map((blocker) => (
                <p
                  className="text-muted-foreground text-sm"
                  key={`${role.role}-${blocker.kind}`}
                >
                  {blocker.message}
                </p>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
    </section>
  );
}
