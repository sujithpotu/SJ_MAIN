import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/product-form";
import { DeleteProductButton } from "@/components/products/product-actions";
import { updateProduct } from "../actions";
import type { Product } from "@/types/database";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (profile?.role !== "manager") redirect("/products");

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    return <p className="text-sm text-destructive">{error?.message ?? "Product not found."}</p>;
  }

  const updateWithId = updateProduct.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{(product as Product).name}</h1>
      <ProductForm initial={product as Product} submitLabel="Save changes" onSubmit={updateWithId} />
      <div className="border-t pt-4">
        <DeleteProductButton productId={id} />
      </div>
    </div>
  );
}
