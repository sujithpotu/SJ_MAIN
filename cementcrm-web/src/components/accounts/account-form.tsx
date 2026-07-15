"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionChips } from "@/components/option-chips";
import { PickerDialog, type PickerItem } from "@/components/picker-dialog";
import { ACCOUNT_TYPES, type Account, type AccountType } from "@/types/database";
import type { AccountFormState } from "@/app/(dashboard)/accounts/actions";

export function AccountForm({
  initial,
  isManager,
  currentUserId,
  currentUserName,
  submitLabel,
  onSubmit,
}: {
  initial?: Account & { repName?: string };
  isManager: boolean;
  currentUserId: string;
  currentUserName: string;
  submitLabel: string;
  onSubmit: (values: AccountFormState) => Promise<{ error: string | null } | void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "dealer");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contact_person ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [assignedRep, setAssignedRep] = useState(initial?.assigned_rep ?? currentUserId);
  const [assignedRepName, setAssignedRepName] = useState(
    initial?.repName ?? currentUserName
  );
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
        setReps(
          (data ?? []).map((p) => ({ id: p.id, title: p.full_name ?? p.id, subtitle: p.role }))
        );
      });
  }, [isManager]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Account name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        name: name.trim(),
        type,
        location: location.trim(),
        contact_person: contactPerson.trim(),
        phone: phone.trim(),
        assigned_rep: assignedRep,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <OptionChips label="Type" options={ACCOUNT_TYPES} value={type} onChange={setType} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact">Contact person</Label>
        <Input
          id="contact"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Assigned sales rep</Label>
        {isManager ? (
          <Button
            type="button"
            variant="outline"
            className="justify-start font-normal"
            onClick={() => setPickerOpen(true)}
          >
            {assignedRepName || "Select a rep"}
          </Button>
        ) : (
          <Input value={currentUserName} disabled />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-2 w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>

      <PickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Select sales rep"
        items={reps}
        onSelect={(item) => {
          setAssignedRep(item.id);
          setAssignedRepName(item.title);
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
