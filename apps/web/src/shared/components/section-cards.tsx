import { IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total Revenue</CardTitle>
          <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">$45,231.89</div>
          <p className="text-muted-foreground text-xs">
            +20.1% from last month
          </p>
          <div className="mt-4">
            <Badge variant="outline">+12.5%</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Subscriptions</CardTitle>
          <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">+2350</div>
          <p className="text-muted-foreground text-xs">
            +180.1% from last month
          </p>
          <div className="mt-4">
            <Badge variant="outline">+54.5%</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Sales</CardTitle>
          <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">+12,234</div>
          <p className="text-muted-foreground text-xs">+19% from last month</p>
          <div className="mt-4">
            <Badge variant="outline">+2.5%</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Active Now</CardTitle>
          <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">+573</div>
          <p className="text-muted-foreground text-xs">+201 since last hour</p>
          <div className="mt-4">
            <Badge variant="outline">+10.5%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
