"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApprovalQueue, type QuotationRow } from "@/components/quotations/approval-queue";
import { generateQuotation } from "@/app/(dashboard)/leads/actions";

export function LeadQuotations({
  leadId,
  quotations,
  isManager,
  hasPendingApproval,
  locked,
}: {
  leadId: string;
  quotations: QuotationRow[];
  isManager: boolean;
  hasPendingApproval: boolean;
  locked?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateQuotation(leadId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quotations</h3>
        {!locked && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || hasPendingApproval}
            onClick={handleGenerate}
          >
            {pending ? "Generating…" : "+ Generate"}
          </Button>
        )}
      </div>
      {hasPendingApproval && !locked && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          A quotation is pending approval — approve or reject it before generating another.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ApprovalQueue quotations={quotations} isManager={isManager} />
    </div>
  );
}
