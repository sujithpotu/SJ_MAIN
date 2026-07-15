"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ComplaintSeverity, ComplaintStatus, ComplaintType } from "@/types/database";

export async function createComplaint(values: {
  account_id: string;
  product_id: string | null;
  type: ComplaintType;
  severity: ComplaintSeverity;
  batch_or_truck_ref: string;
  description: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("complaints")
    .insert({
      account_id: values.account_id,
      product_id: values.product_id,
      type: values.type,
      severity: values.severity,
      batch_or_truck_ref: values.batch_or_truck_ref || null,
      description: values.description,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Unknown error" };
  revalidatePath("/complaints");
  redirect(`/complaints/${data.id}`);
}

export async function updateComplaint(
  id: string,
  values: {
    status: ComplaintStatus;
    statusComment: string;
    root_cause: string;
    corrective_action: string;
    assigned_to: string | null;
  }
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("complaints")
    .select("status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("complaints")
    .update({
      status: values.status,
      root_cause: values.root_cause || null,
      corrective_action: values.corrective_action || null,
      assigned_to: values.assigned_to,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  if (existing && existing.status !== values.status) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("complaint_status_history").insert({
      complaint_id: id,
      status: values.status,
      comment: values.statusComment || null,
      changed_by: user?.id,
    });
  }

  revalidatePath("/complaints");
  revalidatePath(`/complaints/${id}`);
  revalidatePath("/");
  return { error: null };
}

export async function deleteComplaint(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("complaints").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/complaints");
  redirect("/complaints");
}
