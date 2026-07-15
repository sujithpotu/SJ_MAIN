import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ComplaintDetailForm } from "@/components/complaints/complaint-detail-form";
import { ComplaintTimeline } from "@/components/complaints/complaint-timeline";
import { DeleteComplaintButton } from "@/components/complaints/complaint-actions";
import { formatDate } from "@/lib/format";
import { updateComplaint } from "../actions";
import { COMPLAINT_STATUS_LABELS, type Complaint, type ComplaintStatus } from "@/types/database";

interface ComplaintWithJoins extends Complaint {
  account: { name: string } | null;
  product: { name: string } | null;
  assigned: { full_name: string | null } | null;
}

const STATUS_VARIANT: Record<ComplaintStatus, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  closed: "outline",
};

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const { data: complaint, error } = await supabase
    .from("complaints")
    .select(
      "*, account:accounts(name), product:products(name), assigned:profiles!assigned_to(full_name)"
    )
    .eq("id", id)
    .single();

  if (error || !complaint) {
    return (
      <p className="text-sm text-destructive">{error?.message ?? "Complaint not found."}</p>
    );
  }

  const c = complaint as unknown as ComplaintWithJoins;
  const isManager = profile?.role === "manager";
  const updateWithId = updateComplaint.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{c.complaint_number}</h1>
          <Badge variant={STATUS_VARIANT[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {c.account?.name ?? "Unknown account"}
          {c.product?.name ? ` · ${c.product.name}` : ""} · {formatDate(c.created_at)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Description</h3>
        <p className="text-sm">{c.description}</p>
        {c.batch_or_truck_ref && (
          <p className="text-xs text-muted-foreground">Ref: {c.batch_or_truck_ref}</p>
        )}
      </div>

      <ComplaintDetailForm
        complaint={c}
        assignedToName={c.assigned?.full_name ?? null}
        isManager={isManager}
        onSubmit={updateWithId}
      />

      <ComplaintTimeline complaintId={id} />

      {isManager && (
        <div className="border-t pt-4">
          <DeleteComplaintButton complaintId={id} />
        </div>
      )}
    </div>
  );
}
