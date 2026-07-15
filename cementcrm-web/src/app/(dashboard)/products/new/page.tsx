import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/product-form";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (profile?.role !== "manager") redirect("/products");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New product</h1>
      <ProductForm submitLabel="Create product" onSubmit={createProduct} />
    </div>
  );
}
