"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { itemSetsMatch, lineNeedsApproval, type ComparableLine } from "@/lib/pricing";
import type { LeadStage } from "@/types/database";

export async function createLead(values: {
  account_id: string;
  stage: LeadStage;
  expected_order_date: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      account_id: values.account_id,
      stage: values.stage,
      expected_order_date: values.expected_order_date || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Unknown error" };
  revalidatePath("/leads");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(
  leadId: string,
  values: { account_id: string; stage: LeadStage; expected_order_date: string; stageComment: string }
) {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("leads").select("stage").eq("id", leadId).single();

  const { error } = await supabase
    .from("leads")
    .update({
      account_id: values.account_id,
      stage: values.stage,
      expected_order_date: values.expected_order_date || null,
    })
    .eq("id", leadId);

  if (error) return { error: error.message };

  if (existing && existing.stage !== values.stage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("lead_stage_history").insert({
      lead_id: leadId,
      stage: values.stage,
      comment: values.stageComment || null,
      changed_by: user?.id,
    });
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { error: null };
}

export async function deleteLead(leadId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return { error: error.message };
  revalidatePath("/leads");
  redirect("/leads");
}

export async function addLeadItem(leadId: string, productId: string, price: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_items")
    .insert({
      lead_id: leadId,
      product_id: productId,
      quantity: 1,
      unit_price: price,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Unknown error", id: null };
  revalidatePath(`/leads/${leadId}`);
  return { error: null, id: data.id as string };
}

export async function updateLeadItem(
  leadId: string,
  itemId: string,
  quantity: number,
  unitPrice: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_items")
    .update({ quantity, unit_price: unitPrice })
    .eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function removeLeadItem(leadId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lead_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/leads/${leadId}`);
  return { error: null };
}

export async function generateQuotation(leadId: string) {
  const supabase = await createClient();

  const { data: leadItems, error: itemsError } = await supabase
    .from("lead_items")
    .select("product_id, quantity, unit_price, product:products(price)")
    .eq("lead_id", leadId);

  if (itemsError) return { error: itemsError.message };
  if (!leadItems || leadItems.length === 0) {
    return { error: "Add at least one product to this lead before generating a quotation." };
  }

  const currentLines: ComparableLine[] = leadItems.map((item: any) => ({
    product_id: item.product_id,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  }));

  const isDiscounted = leadItems.some((item: any) =>
    lineNeedsApproval(Number(item.product?.price ?? 0), Number(item.unit_price))
  );

  const { data: lastBlessed } = await supabase
    .from("quotations")
    .select("id, quotation_items(product_id, quantity, unit_price)")
    .eq("lead_id", leadId)
    .in("status", ["approved", "sent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let needsApproval = isDiscounted;
  if (lastBlessed) {
    const lastLines: ComparableLine[] = (lastBlessed.quotation_items as any[]).map((i) => ({
      product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));
    needsApproval = !itemSetsMatch(currentLines, lastLines);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: quotation, error: qError } = await supabase
    .from("quotations")
    .insert({
      lead_id: leadId,
      status: needsApproval ? "pending_approval" : "draft",
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (qError || !quotation) return { error: qError?.message ?? "Unknown error" };

  const { error: qiError } = await supabase.from("quotation_items").insert(
    leadItems.map((item: any) => ({
      quotation_id: quotation.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
  );

  if (qiError) return { error: qiError.message };

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/quotations");
  revalidatePath("/");
  return { error: null, quotationId: quotation.id as string };
}
