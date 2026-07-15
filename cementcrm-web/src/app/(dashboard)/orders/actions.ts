"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveDeliveryDetails(
  orderId: string,
  values: {
    delivery_date: string;
    delivery_address: string;
    vehicle_info: string;
    driver_info: string;
  }
) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("sales_orders")
    .select("status")
    .eq("id", orderId)
    .single();

  const update: Record<string, unknown> = {
    delivery_date: values.delivery_date || null,
    delivery_address: values.delivery_address.trim() || null,
    vehicle_info: values.vehicle_info.trim() || null,
    driver_info: values.driver_info.trim() || null,
  };

  if (order?.status === "confirmed" && values.delivery_date && values.delivery_address.trim()) {
    update.status = "delivery_planned";
  }

  const { error } = await supabase.from("sales_orders").update(update).eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { error: null };
}

export async function dispatchOrder(
  orderId: string,
  values: {
    delivery_date: string;
    delivery_address: string;
    vehicle_info: string;
    driver_info: string;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_orders")
    .update({
      status: "dispatched",
      dispatched_at: new Date().toISOString(),
      delivery_date: values.delivery_date,
      delivery_address: values.delivery_address.trim() || null,
      vehicle_info: values.vehicle_info.trim() || null,
      driver_info: values.driver_info.trim() || null,
    })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { error: null };
}

export async function markDelivered(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { error: null };
}
