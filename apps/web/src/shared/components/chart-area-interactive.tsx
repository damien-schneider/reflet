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
  { desktop: 186, mobile: 80, month: "Jan" },
  { desktop: 305, mobile: 200, month: "Feb" },
  { desktop: 237, mobile: 120, month: "Mar" },
  { desktop: 73, mobile: 190, month: "Apr" },
  { desktop: 209, mobile: 130, month: "May" },
  { desktop: 214, mobile: 140, month: "Jun" },
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
                bottom: 0,
                left: 0,
                right: 30,
                top: 10,
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
