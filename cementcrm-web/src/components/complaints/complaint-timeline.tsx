import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { COMPLAINT_STATUS_LABELS, type ComplaintStatus } from "@/types/database";

export async function ComplaintTimeline({ complaintId }: { complaintId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("complaint_status_history")
    .select("id, status, changed_at, comment, changed_by:profiles(full_name)")
    .eq("complaint_id", complaintId)
    .order("changed_at", { ascending: true });

  const history = (data as unknown as
    | {
        id: string;
        status: ComplaintStatus;
        changed_at: string;
        comment: string | null;
        changed_by: { full_name: string | null } | null;
      }[]
    | null) ?? [];

  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Status timeline</h3>
      <div className="flex flex-col gap-3 border-l pl-4">
        {history.map((entry) => (
          <div key={entry.id}>
            <p className="text-sm font-medium">{COMPLAINT_STATUS_LABELS[entry.status]}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(entry.changed_at)}
              {entry.changed_by?.full_name ? ` · ${entry.changed_by.full_name}` : ""}
            </p>
            {entry.comment && <p className="mt-1 text-sm italic">{entry.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
