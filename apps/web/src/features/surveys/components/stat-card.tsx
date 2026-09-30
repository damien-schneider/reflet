import { Card, CardContent } from "@ctrl-ui/react/ui/card";

interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="mt-1 font-semibold text-2xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
