"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionChips } from "@/components/option-chips";
import { PickerDialog, type PickerItem } from "@/components/picker-dialog";
import { LEAD_STAGES, type Lead, type LeadStage } from "@/types/database";

export interface LeadFormValues {
  account_id: string;
  stage: LeadStage;
  expected_order_date: string;
  stageComment: string;
}

export function LeadForm({
  initial,
  initialAccountName,
  submitLabel,
  onSubmit,
}: {
  initial?: Lead;
  initialAccountName?: string;
  submitLabel: string;
  onSubmit: (values: LeadFormValues) => Promise<{ error: string | null } | void>;
}) {
  const [accountId, setAccountId] = useState(initial?.account_id ?? "");
  const [accountName, setAccountName] = useState(initialAccountName ?? "");
  const [accounts, setAccounts] = useState<PickerItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const initialStage = initial?.stage ?? "New Lead";
  const [stage, setStage] = useState<LeadStage>(initialStage);
  const [stageComment, setStageComment] = useState("");
  const [expectedDate, setExpectedDate] = useState(initial?.expected_order_date ?? "");
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
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setError("Select an account for this lead.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        account_id: accountId,
        stage,
        expected_order_date: expectedDate,
        stageComment: stageComment.trim(),
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
          onClick={() => setPickerOpen(true)}
        >
          {accountName || "Select an account"}
        </Button>
      </div>

      <OptionChips
        label="Pipeline stage"
        options={LEAD_STAGES.map((s) => ({ value: s, label: s }))}
        value={stage}
        onChange={setStage}
      />

      {initial && stage !== initialStage && (
        <div className="flex flex-col gap-1.5">
          <Label>Comment on this stage change (optional)</Label>
          <Textarea
            value={stageComment}
            onChange={(e) => setStageComment(e.target.value)}
            placeholder={`Why is this moving to "${stage}"?`}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expected-date">Expected order date</Label>
        <input
          id="expected-date"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-2 w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>

      <PickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Select account"
        items={accounts}
        onSelect={(item) => {
          setAccountId(item.id);
          setAccountName(item.title);
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
