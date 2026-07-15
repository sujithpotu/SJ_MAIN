"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
}

export function PickerDialog({
  open,
  onOpenChange,
  title,
  items,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No results</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(item);
                setQuery("");
              }}
            >
              <span className="font-medium">{item.title}</span>
              {item.subtitle && (
                <span className="text-xs text-muted-foreground">{item.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
