"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/types/database";

export interface AccountFormState {
  name: string;
  type: AccountType;
  location: string;
  contact_person: string;
  phone: string;
  assigned_rep: string;
}

export async function createAccount(values: AccountFormState) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      name: values.name,
      type: values.type,
      location: values.location || null,
      contact_person: values.contact_person || null,
      phone: values.phone || null,
      assigned_rep: values.assigned_rep,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Unknown error" };

  revalidatePath("/accounts");
  redirect(`/accounts/${data.id}`);
}

export async function updateAccount(id: string, values: AccountFormState) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      name: values.name,
      type: values.type,
      location: values.location || null,
      contact_person: values.contact_person || null,
      phone: values.phone || null,
      assigned_rep: values.assigned_rep,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  return { error: null };
}

export async function convertToLead(accountId: string) {
  const supabase = await createClient();

  const { error: statusError } = await supabase
    .from("accounts")
    .update({ status: "active" })
    .eq("id", accountId);
  if (statusError) return { error: statusError.message };

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({ account_id: accountId, stage: "New Lead" })
    .select("id")
    .single();
  if (leadError || !lead) return { error: leadError?.message ?? "Unknown error" };

  revalidatePath("/accounts");
  redirect(`/leads/${lead.id}`);
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/accounts");
  redirect("/accounts");
}
