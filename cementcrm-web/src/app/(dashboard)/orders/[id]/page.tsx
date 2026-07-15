import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { OrderDeliveryForm } from "@/components/orders/order-delivery-form";
import { formatCurrency } from "@/lib/format";
import { SALES_ORDER_STATUS_LABELS, type SalesOrder, type SalesOrderStatus } from "@/types/database";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
}

interface OrderWithAccount extends SalesOrder {
  account: {
    name: string;
    location: string | null;
    contact_person: string | null;
    phone: string | null;
  } | null;
}

const STATUS_VARIANT: Record<SalesOrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  confirmed: "outline",
  delivery_planned: "secondary",
  dispatched: "default",
  delivered: "secondary",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [orderRes, itemsRes] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("*, account:accounts(name, location, contact_person, phone)")
      .eq("id", id)
      .single(),
    supabase
      .from("sales_order_items")
      .select("id, quantity, unit_price, product:products(name)")
      .eq("sales_order_id", id),
  ]);

  const order = orderRes.data as unknown as OrderWithAccount | null;
  const items = (itemsRes.data as unknown as OrderItem[]) ?? [];

  if (orderRes.error || !order) {
    return (
      <p className="text-sm text-destructive">
        {orderRes.error?.message ?? "Order not found."}
      </p>
    );
  }

  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge variant={STATUS_VARIANT[order.status]}>
          {SALES_ORDER_STATUS_LABELS[order.status]}
        </Badge>
        <h1 className="mt-2 text-2xl font-semibold">{order.account?.name ?? "Unknown account"}</h1>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Items</h3>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.product?.name ?? "Unknown product"}</span>
            <span className="text-muted-foreground">
              {item.quantity} × {formatCurrency(Number(item.unit_price))} ={" "}
              {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <OrderDeliveryForm
        order={order}
        accountName={order.account?.name ?? "Unknown account"}
        accountLocation={order.account?.location ?? null}
        accountContact={order.account?.contact_person ?? null}
        accountPhone={order.account?.phone ?? null}
        items={items.map((item) => ({
          productName: item.product?.name ?? "Unknown product",
          quantity: Number(item.quantity),
        }))}
      />
    </div>
  );
}
