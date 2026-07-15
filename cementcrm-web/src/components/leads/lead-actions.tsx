"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteLead } from "@/app/(dashboard)/leads/actions";

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this lead? This cannot be undone.")) return;
        startTransition(() => { void deleteLead(leadId); });
      }}
    >
      {pending ? "Deleting…" : "Delete lead"}
    </Button>
  );
}
