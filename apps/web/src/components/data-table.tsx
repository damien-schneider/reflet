"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableItem {
  invoice: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: string;
}

export function DataTable({ data }: { data: DataTableItem[] }) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.invoice}>
                  <TableCell className="font-medium">{item.invoice}</TableCell>
                  <TableCell>{item.paymentStatus}</TableCell>
                  <TableCell>{item.paymentMethod}</TableCell>
                  <TableCell className="text-right">
                    {item.totalAmount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
