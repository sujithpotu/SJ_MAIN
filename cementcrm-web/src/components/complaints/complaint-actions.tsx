"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteComplaint } from "@/app/(dashboard)/complaints/actions";

export function DeleteComplaintButton({ complaintId }: { complaintId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this complaint? This cannot be undone.")) return;
        startTransition(() => { void deleteComplaint(complaintId); });
      }}
    >
      {pending ? "Deleting…" : "Delete complaint"}
    </Button>
  );
}
