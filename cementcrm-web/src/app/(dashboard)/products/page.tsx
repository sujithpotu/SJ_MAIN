import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { productImageUrl } from "@/lib/product-images";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/database";

export default async function ProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, productsRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("products").select("*").order("name"),
  ]);

  const isManager = profileRes.data?.role === "manager";
  const products = (productsRes.data as Product[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {isManager ? "Manage the product catalog." : "Product catalog (view only)."}
          </p>
        </div>
        {isManager && (
          <Button asChild>
            <Link href="/products/new">New product</Link>
          </Button>
        )}
      </div>

      {productsRes.error && (
        <p className="text-sm text-destructive">{productsRes.error.message}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const imageUrl = productImageUrl(product.image_path);
          const card = (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="aspect-square w-full rounded-md bg-muted object-cover"
                />
              ) : (
                <div className="aspect-square w-full rounded-md bg-muted" />
              )}
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Number(product.price))}
              </p>
            </div>
          );
          return isManager ? (
            <Link key={product.id} href={`/products/${product.id}`}>
              {card}
            </Link>
          ) : (
            <div key={product.id}>{card}</div>
          );
        })}
        {products.length === 0 && !productsRes.error && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No products yet.
          </p>
        )}
      </div>
    </div>
  );
}
