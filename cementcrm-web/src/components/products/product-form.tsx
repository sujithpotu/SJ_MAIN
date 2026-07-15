"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productImageUrl, uploadProductImage } from "@/lib/product-images";
import { setProductImage } from "@/app/(dashboard)/products/actions";
import type { Product } from "@/types/database";

export interface ProductFormValues {
  name: string;
  price: string;
}

export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Product;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<{ error: string | null; id?: string }>;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    productImageUrl(initial?.image_path ?? null)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (price && Number.isNaN(Number(price))) {
      setError("Price must be a number.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({ name: name.trim(), price });
      if (result.error) {
        setError(result.error);
        return;
      }
      const productId = initial?.id ?? result.id;
      if (file && productId) {
        try {
          const path = await uploadProductImage(file, productId);
          await setProductImage(productId, path);
        } catch (err: unknown) {
          setError(`Saved, but image upload failed: ${err instanceof Error ? err.message : err}`);
          router.refresh();
          return;
        }
      }
      router.push(`/products/${productId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <label htmlFor="product-image" className="cursor-pointer">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-32 w-32 rounded-lg bg-muted object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-muted text-center text-xs text-muted-foreground">
              Tap to add image
            </div>
          )}
        </label>
        <input
          id="product-image"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-name">Name</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. OPC 53 Grade"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-price">Price (per unit)</Label>
        <Input
          id="product-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 380"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-2 w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
