"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reviewQuotation(
  quotationId: string,
  status: "approved" | "rejected",
  comment: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ status, notes: comment || null })
    .eq("id", quotationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/quotations");
  revalidatePath("/");
  return { error: null };
}
