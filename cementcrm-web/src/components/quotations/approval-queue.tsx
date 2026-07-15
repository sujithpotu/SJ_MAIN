"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { QUOTATION_STATUS_LABELS, type QuotationStatus } from "@/types/database";
import { reviewQuotation } from "@/app/(dashboard)/quotations/actions";

export interface QuotationRow {
  id: string;
  status: QuotationStatus;
  notes: string | null;
  created_at: string;
  accountName: string;
  items: { id: string; productName: string; quantity: number; unitPrice: number }[];
}

const STATUS_VARIANT: Record<QuotationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending_approval: "default",
  approved: "secondary",
  rejected: "destructive",
  sent: "secondary",
};

export function ApprovalQueue({
  quotations,
  isManager,
}: {
  quotations: QuotationRow[];
  isManager: boolean;
}) {
  const [active, setActive] = useState<QuotationRow | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = (q: QuotationRow) =>
    q.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleReview = (status: "approved" | "rejected") => {
    if (!active) return;
    setError(null);
    startTransition(async () => {
      const result = await reviewQuotation(active.id, status, comment);
      if (result.error) {
        setError(result.error);
        return;
      }
      setActive(null);
      setComment("");
    });
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.accountName}</TableCell>
                <TableCell>{formatDate(q.created_at)}</TableCell>
                <TableCell>{formatCurrency(total(q))}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[q.status]}>
                    {QUOTATION_STATUS_LABELS[q.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActive(q);
                      setComment("");
                      setError(null);
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {quotations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No quotations here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.accountName}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-2">
                {active.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.productName}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice)} ={" "}
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total(active))}</span>
                </div>
              </div>

              {active.notes && (
                <p className="rounded-md bg-muted p-3 text-sm">{active.notes}</p>
              )}

              {active.status === "pending_approval" && isManager && (
                <>
                  <Textarea
                    placeholder="Comment (optional -- shown especially if rejecting)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      disabled={pending}
                      onClick={() => handleReview("rejected")}
                    >
                      Reject
                    </Button>
                    <Button disabled={pending} onClick={() => handleReview("approved")}>
                      Approve
                    </Button>
                  </DialogFooter>
                </>
              )}

              {active.status === "pending_approval" && !isManager && (
                <p className="text-sm text-muted-foreground">
                  Waiting for manager approval.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
