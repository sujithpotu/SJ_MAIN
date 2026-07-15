"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { productImageUrl } from "@/lib/product-images";
import { formatCurrency } from "@/lib/format";

export interface PickableProduct {
  id: string;
  name: string;
  price: number;
  image_path: string | null;
}

export function ProductPickerDialog({
  open,
  onOpenChange,
  products,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: PickableProduct[];
  onSelect: (product: PickableProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select product</DialogTitle>
        </DialogHeader>

        <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />

        <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {filtered.map((product) => {
            const imageUrl = productImageUrl(product.image_path);
            return (
              <button
                key={product.id}
                type="button"
                className="flex flex-col gap-1 rounded-lg border p-2 text-left hover:bg-accent"
                onClick={() => onSelect(product)}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="aspect-square w-full rounded-md bg-muted object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted text-center text-[10px] text-muted-foreground">
                    No image
                  </div>
                )}
                <span className="line-clamp-2 text-xs font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(product.price)}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
              No products found.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
