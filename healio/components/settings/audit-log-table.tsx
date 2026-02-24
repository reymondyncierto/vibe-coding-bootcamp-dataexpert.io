import { Badge } from "@/components/ui/badge";

export type AuditLogItemView = {
  id: string;
  occurredAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AuditLogTable({
  items,
  chainOk,
}: {
  items: AuditLogItemView[];
  chainOk: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm">
        <p className="font-medium text-ink">No audit log entries match the current filters</p>
        <p className="mt-1 text-muted">Try clearing filters or perform a settings/billing action to generate entries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={chainOk ? "success" : "danger"}>
          {chainOk ? "Integrity OK" : "Integrity Warning"}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-card border border-border bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.summary}</p>
                <p className="mt-1 text-xs text-muted">{formatTime(item.occurredAt)} • {item.actorRole ?? "SYSTEM"} • {item.actorUserId ?? "system"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{item.action}</Badge>
                <Badge variant="neutral">{item.entityType}{item.entityId ? `:${item.entityId}` : ""}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

