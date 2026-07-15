import { LeadForm } from "@/components/leads/lead-form";
import { createLead } from "../actions";

export default function NewLeadPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New lead</h1>
      <LeadForm submitLabel="Create lead" onSubmit={createLead} />
    </div>
  );
}
