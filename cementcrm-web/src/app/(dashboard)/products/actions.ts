"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(values: { name: string; price: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ name: values.name, price: values.price ? Number(values.price) : 0 })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Unknown error" };
  revalidatePath("/products");
  return { error: null, id: data.id as string };
}

export async function updateProduct(id: string, values: { name: string; price: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ name: values.name, price: values.price ? Number(values.price) : 0 })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { error: null, id };
}

export async function setProductImage(id: string, imagePath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ image_path: imagePath }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { error: null };
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/products");
  redirect("/products");
}
