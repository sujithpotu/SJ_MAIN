"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reviewQuotation(
  quotationId: string,
  status: "approved" | "rejected",
  comment: string
) {
  const supabase = await createClient();
  const { data: quotation } = await supabase
    .from("quotations")
    .select("lead_id")
    .eq("id", quotationId)
    .single();

  const { error } = await supabase
    .from("quotations")
    .update({ status, notes: comment || null })
    .eq("id", quotationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/quotations");
  revalidatePath("/");
  if (quotation) revalidatePath(`/leads/${quotation.lead_id}`);
  return { error: null };
}

export async function convertToSalesOrder(quotationId: string) {
  const supabase = await createClient();

  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("id, lead_id, lead:leads(account_id, account:accounts(location))")
    .eq("id", quotationId)
    .single();

  if (quotationError || !quotation) {
    return { error: quotationError?.message ?? "Quotation not found." };
  }

  const lead = quotation.lead as unknown as {
    account_id: string;
    account: { location: string | null } | null;
  } | null;

  if (!lead) return { error: "Lead not found for this quotation." };

  const { data: existingOrder } = await supabase
    .from("sales_orders")
    .select("id")
    .eq("lead_id", quotation.lead_id)
    .maybeSingle();

  if (existingOrder) {
    return { error: null, orderId: existingOrder.id as string };
  }

  const { data: quotationItems, error: itemsError } = await supabase
    .from("quotation_items")
    .select("product_id, quantity, unit_price")
    .eq("quotation_id", quotationId);

  if (itemsError) return { error: itemsError.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order, error: orderError } = await supabase
    .from("sales_orders")
    .insert({
      lead_id: quotation.lead_id,
      quotation_id: quotation.id,
      account_id: lead.account_id,
      delivery_address: lead.account?.location ?? null,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "Unknown error" };

  const { error: orderItemsError } = await supabase.from("sales_order_items").insert(
    (quotationItems ?? []).map((item) => ({
      sales_order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
  );

  if (orderItemsError) return { error: orderItemsError.message };

  revalidatePath("/orders");
  revalidatePath(`/leads/${quotation.lead_id}`);
  return { error: null, orderId: order.id as string };
}
