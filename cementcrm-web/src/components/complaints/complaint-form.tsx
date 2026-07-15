"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionChips } from "@/components/option-chips";
import { PickerDialog, type PickerItem } from "@/components/picker-dialog";
import { ProductPickerDialog, type PickableProduct } from "@/components/products/product-picker-dialog";
import {
  COMPLAINT_SEVERITIES,
  COMPLAINT_TYPES,
  type ComplaintSeverity,
  type ComplaintType,
} from "@/types/database";

export interface ComplaintFormValues {
  account_id: string;
  product_id: string | null;
  type: ComplaintType;
  severity: ComplaintSeverity;
  batch_or_truck_ref: string;
  description: string;
}

export function ComplaintForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (values: ComplaintFormValues) => Promise<{ error: string | null } | void>;
}) {
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accounts, setAccounts] = useState<PickerItem[]>([]);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const [product, setProduct] = useState<PickableProduct | null>(null);
  const [products, setProducts] = useState<PickableProduct[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [type, setType] = useState<ComplaintType>("quality");
  const [severity, setSeverity] = useState<ComplaintSeverity>("medium");
  const [batchRef, setBatchRef] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("accounts")
      .select("id, name, type")
      .order("name")
      .then(({ data }) => {
        setAccounts((data ?? []).map((a) => ({ id: a.id, title: a.name, subtitle: a.type })));
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError("Select an account.");
      return;
    }
    if (!description.trim()) {
      setError("Describe the complaint.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        account_id: accountId,
        product_id: product?.id ?? null,
        type,
        severity,
        batch_or_truck_ref: batchRef.trim(),
        description: description.trim(),
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Account</Label>
        <Button
          type="button"
          variant="outline"
          className="justify-start font-normal"
          onClick={() => setAccountPickerOpen(true)}
        >
          {accountName || "Select an account"}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Product (optional)</Label>
        <Button
          type="button"
          variant="outline"
          className="justify-start font-normal"
          onClick={() => setProductPickerOpen(true)}
        >
          {product?.name ?? "Select a product"}
        </Button>
        {product && (
          <button
            type="button"
            className="w-fit text-xs text-muted-foreground underline"
            onClick={() => setProduct(null)}
          >
            Clear
          </button>
        )}
      </div>

      <OptionChips label="Type" options={COMPLAINT_TYPES} value={type} onChange={setType} />
      <OptionChips
        label="Severity"
        options={COMPLAINT_SEVERITIES}
        value={severity}
        onChange={setSeverity}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="batch-ref">Batch / truck reference (optional)</Label>
        <Input
          id="batch-ref"
          value={batchRef}
          onChange={(e) => setBatchRef(e.target.value)}
          placeholder="e.g. Batch #4521, Truck ABC-1234"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened?"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-2 w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>

      <PickerDialog
        open={accountPickerOpen}
        onOpenChange={setAccountPickerOpen}
        title="Select account"
        items={accounts}
        onSelect={(item) => {
          setAccountId(item.id);
          setAccountName(item.title);
          setAccountPickerOpen(false);
        }}
      />

      <ProductPickerDialog
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        products={products}
        onSelect={(p) => {
          setProduct(p);
          setProductPickerOpen(false);
        }}
      />
    </form>
  );
}
