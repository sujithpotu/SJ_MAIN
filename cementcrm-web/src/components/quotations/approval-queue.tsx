"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { convertToSalesOrder, reviewQuotation } from "@/app/(dashboard)/quotations/actions";

export interface QuotationRow {
  id: string;
  leadId: string;
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
  const router = useRouter();
  const [active, setActive] = useState<QuotationRow | null>(null);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const total = (q: QuotationRow) =>
    q.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  useEffect(() => {
    if (!active || (active.status !== "approved" && active.status !== "sent")) {
      setExistingOrderId(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("sales_orders")
      .select("id")
      .eq("lead_id", active.leadId)
      .maybeSingle()
      .then(({ data }) => setExistingOrderId(data?.id ?? null));
  }, [active]);

  const handleConvert = async () => {
    if (!active) return;
    setConverting(true);
    setError(null);
    const result = await convertToSalesOrder(active.id);
    setConverting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.orderId) router.push(`/orders/${result.orderId}`);
  };

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
      router.refresh();
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

              {error && <p className="text-sm text-destructive">{error}</p>}

              {active.status === "pending_approval" && isManager && (
                <>
                  <Textarea
                    placeholder="Comment (optional -- shown especially if rejecting)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
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

              {(active.status === "approved" || active.status === "sent") && (
                <DialogFooter>
                  {existingOrderId ? (
                    <Button onClick={() => router.push(`/orders/${existingOrderId}`)}>
                      View sales order
                    </Button>
                  ) : (
                    <Button disabled={converting} onClick={handleConvert}>
                      {converting ? "Creating…" : "Convert to sales order"}
                    </Button>
                  )}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
