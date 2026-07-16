"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  getComplaintAttachmentUrl,
  uploadComplaintAttachment,
} from "@/lib/complaint-attachments";
import {
  addComplaintAttachment,
  removeComplaintAttachment,
} from "@/app/(dashboard)/complaints/actions";
import type { ComplaintAttachment } from "@/types/database";

function isImage(contentType: string | null) {
  return !!contentType && contentType.startsWith("image/");
}

export function ComplaintAttachments({
  complaintId,
  initialAttachments,
}: {
  complaintId: string;
  initialAttachments: ComplaintAttachment[];
}) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        attachments.map(async (a) => [a.id, await getComplaintAttachmentUrl(a.file_path)] as const)
      );
      if (cancelled) return;
      setUrls(Object.fromEntries(entries.filter(([, url]) => url) as [string, string][]));
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(fileList)) {
      try {
        const path = await uploadComplaintAttachment(file, complaintId);
        const result = await addComplaintAttachment(complaintId, path, file.name, file.type || null);
        if (result.error || !result.id) {
          setError(result.error ?? "Could not save attachment.");
          continue;
        }
        setAttachments((prev) => [
          ...prev,
          {
            id: result.id!,
            complaint_id: complaintId,
            file_path: path,
            file_name: file.name,
            content_type: file.type || null,
            uploaded_by: null,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err: unknown) {
        setError(`Upload failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (attachment: ComplaintAttachment) => {
    if (!confirm(`Remove "${attachment.file_name}"?`)) return;
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    startTransition(async () => {
      const result = await removeComplaintAttachment(attachment.id, complaintId, attachment.file_path);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Attachments</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "+ Add attachment"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {attachments.map((a) => {
            const url = urls[a.id];
            return (
              <div key={a.id} className="flex flex-col gap-1 rounded-lg border p-2">
                {url && isImage(a.content_type) ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full rounded-md bg-muted object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-square w-full items-center justify-center rounded-md bg-muted text-center text-[11px] text-muted-foreground underline"
                  >
                    {url ? "Open file" : "Loading…"}
                  </a>
                )}
                <span className="line-clamp-2 text-xs" title={a.file_name}>
                  {a.file_name}
                </span>
                <button
                  type="button"
                  className="w-fit text-xs text-destructive underline"
                  disabled={pending}
                  onClick={() => handleRemove(a)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
