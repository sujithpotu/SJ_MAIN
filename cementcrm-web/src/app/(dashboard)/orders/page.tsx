import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { SALES_ORDER_STATUS_LABELS, type SalesOrderStatus } from "@/types/database";

interface OrderRow {
  id: string;
  status: SalesOrderStatus;
  delivery_date: string | null;
  created_at: string;
  account: { name: string } | null;
}

const STATUS_VARIANT: Record<SalesOrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  confirmed: "outline",
  delivery_planned: "secondary",
  dispatched: "default",
  delivered: "secondary",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_orders")
    .select("id, status, delivery_date, created_at, account:accounts(name)")
    .order("created_at", { ascending: false });

  const orders = (data as unknown as OrderRow[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Sales orders</h1>
        <p className="text-sm text-muted-foreground">
          Convert an approved quotation into an order from a lead&apos;s page.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivery date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="cursor-pointer">
                <TableCell className="font-medium p-0">
                  <Link href={`/orders/${order.id}`} className="block px-2 py-2">
                    {order.account?.name ?? "Unknown account"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[order.status]}>
                    {SALES_ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.delivery_date ? formatDate(order.delivery_date) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  No sales orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
