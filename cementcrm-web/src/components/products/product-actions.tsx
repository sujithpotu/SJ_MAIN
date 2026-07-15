"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/(dashboard)/products/actions";

export function DeleteProductButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Delete this product? Leads/quotations referencing it will keep their data, but it will no longer be selectable."
          )
        )
          return;
        startTransition(() => { void deleteProduct(productId); });
      }}
    >
      {pending ? "Deleting…" : "Delete product"}
    </Button>
  );
}
