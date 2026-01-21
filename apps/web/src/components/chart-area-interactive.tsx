"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartTooltipContent } from "@/components/ui/chart";

const data = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
];

export function ChartAreaInteractive() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor Analytics</CardTitle>
        <CardDescription>
          Showing total visitors for the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="month"
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="desktop"
                fill="var(--color-desktop)"
                fillOpacity={0.4}
                stackId="1"
                stroke="var(--color-desktop)"
                type="monotone"
              />
              <Area
                dataKey="mobile"
                fill="var(--color-mobile)"
                fillOpacity={0.4}
                stackId="1"
                stroke="var(--color-mobile)"
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
