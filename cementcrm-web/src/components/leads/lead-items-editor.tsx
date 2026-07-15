"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductPickerDialog, type PickableProduct } from "@/components/products/product-picker-dialog";
import { formatCurrency } from "@/lib/format";
import { addLeadItem, removeLeadItem, updateLeadItem } from "@/app/(dashboard)/leads/actions";

interface ItemRow {
  id: string;
  product_id: string | null;
  quantity: string;
  unit_price: string;
  productName: string;
}

export function LeadItemsEditor({
  leadId,
  initialItems,
  locked,
}: {
  leadId: string;
  initialItems: ItemRow[];
  locked?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [products, setProducts] = useState<PickableProduct[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("id, name, price, image_path")
      .order("name")
      .then(({ data }) => {
        setProducts(
          (data ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            image_path: p.image_path,
          }))
        );
      });
  }, []);

  const total = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Products</h3>
        {!locked && (
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            + Add product
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
          <span className="flex-1 text-sm font-medium">{item.productName}</span>
          <Input
            type="number"
            className="w-24"
            value={item.quantity}
            disabled={locked}
            onChange={(e) =>
              setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, quantity: e.target.value } : i))
              )
            }
            onBlur={(e) => {
              if (locked) return;
              const qty = Number(e.target.value);
              const price = Number(item.unit_price);
              if (Number.isNaN(qty) || Number.isNaN(price)) return;
              startTransition(() => { void updateLeadItem(leadId, item.id, qty, price); });
            }}
          />
          <Input
            type="number"
            className="w-28"
            value={item.unit_price}
            disabled={locked}
            onChange={(e) =>
              setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, unit_price: e.target.value } : i))
              )
            }
            onBlur={(e) => {
              if (locked) return;
              const price = Number(e.target.value);
              const qty = Number(item.quantity);
              if (Number.isNaN(qty) || Number.isNaN(price)) return;
              startTransition(() => { void updateLeadItem(leadId, item.id, qty, price); });
            }}
          />
          {!locked && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={() => {
                if (!confirm("Remove this product from the lead?")) return;
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                startTransition(() => { void removeLeadItem(leadId, item.id); });
              }}
            >
              Remove
            </Button>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <p className="text-right text-sm font-semibold">Total: {formatCurrency(total)}</p>
      )}

      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        products={products}
        onSelect={(product) => {
          setPickerOpen(false);
          startTransition(async () => {
            const result = await addLeadItem(leadId, product.id, product.price);
            if (!result.error && result.id) {
              setItems((prev) => [
                ...prev,
                {
                  id: result.id!,
                  product_id: product.id,
                  quantity: "1",
                  unit_price: String(product.price),
                  productName: product.name,
                },
              ]);
            }
          });
        }}
      />
    </div>
  );
}
