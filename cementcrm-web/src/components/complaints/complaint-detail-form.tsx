"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionChips } from "@/components/option-chips";
import { PickerDialog, type PickerItem } from "@/components/picker-dialog";
import { COMPLAINT_STATUSES, COMPLAINT_STATUS_LABELS, type Complaint, type ComplaintStatus } from "@/types/database";

export interface ComplaintDetailFormValues {
  status: ComplaintStatus;
  statusComment: string;
  root_cause: string;
  corrective_action: string;
  assigned_to: string | null;
}

export function ComplaintDetailForm({
  complaint,
  assignedToName,
  isManager,
  onSubmit,
}: {
  complaint: Complaint;
  assignedToName: string | null;
  isManager: boolean;
  onSubmit: (values: ComplaintDetailFormValues) => Promise<{ error: string | null } | void>;
}) {
  const initialStatus = complaint.status;
  const [status, setStatus] = useState<ComplaintStatus>(initialStatus);
  const [statusComment, setStatusComment] = useState("");
  const [rootCause, setRootCause] = useState(complaint.root_cause ?? "");
  const [correctiveAction, setCorrectiveAction] = useState(complaint.corrective_action ?? "");
  const [assignedTo, setAssignedTo] = useState<string | null>(complaint.assigned_to);
  const [assignedName, setAssignedName] = useState(assignedToName ?? "");
  const [reps, setReps] = useState<PickerItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isManager) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name")
      .then(({ data }) => {
        setReps((data ?? []).map((p) => ({ id: p.id, title: p.full_name ?? p.id, subtitle: p.role })));
      });
  }, [isManager]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        status,
        statusComment: statusComment.trim(),
        root_cause: rootCause.trim(),
        corrective_action: correctiveAction.trim(),
        assigned_to: assignedTo,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <OptionChips
        label="Status"
        options={COMPLAINT_STATUSES.map((s) => ({ value: s, label: COMPLAINT_STATUS_LABELS[s] }))}
        value={status}
        onChange={setStatus}
      />

      {status !== initialStatus && (
        <div className="flex flex-col gap-1.5">
          <Label>Comment on this status change (optional)</Label>
          <Textarea
            value={statusComment}
            onChange={(e) => setStatusComment(e.target.value)}
            placeholder={`Why is this moving to "${COMPLAINT_STATUS_LABELS[status]}"?`}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="root-cause">Root cause</Label>
        <Textarea
          id="root-cause"
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          placeholder="What caused this?"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="corrective-action">Corrective action</Label>
        <Textarea
          id="corrective-action"
          value={correctiveAction}
          onChange={(e) => setCorrectiveAction(e.target.value)}
          placeholder="What was done to fix / prevent this?"
        />
      </div>

      {isManager && (
        <div className="flex flex-col gap-1.5">
          <Label>Assigned to</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start font-normal"
              onClick={() => setPickerOpen(true)}
            >
              {assignedName || "Unassigned"}
            </Button>
            {assignedTo && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => {
                  setAssignedTo(null);
                  setAssignedName("");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-2 w-fit">
        {pending ? "Saving…" : "Save changes"}
      </Button>

      <PickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Assign to"
        items={reps}
        onSelect={(item) => {
          setAssignedTo(item.id);
          setAssignedName(item.title);
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
