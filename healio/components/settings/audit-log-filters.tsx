import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type AuditLogFiltersState = {
  q: string;
  action: string;
};

export function AuditLogFilters({
  value,
  onChange,
  onRefresh,
}: {
  value: AuditLogFiltersState;
  onChange: (next: AuditLogFiltersState) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-card border border-border bg-white p-3 sm:grid-cols-[1fr_180px_auto]">
      <Input
        name="audit-log-search"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.currentTarget.value })}
        placeholder="Search summary, action, entity..."
        autoComplete="off"
      />
      <Select
        name="audit-log-action"
        value={value.action}
        onChange={(e) => onChange({ ...value, action: e.currentTarget.value })}
      >
        <option value="">All actions</option>
        <option value="CLINIC_SETTINGS_UPDATED">Clinic settings updated</option>
        <option value="STAFF_INVITE_SENT">Staff invite sent</option>
        <option value="INVOICE_MARKED_PAID">Invoice marked paid</option>
        <option value="INVOICE_SENT">Invoice sent</option>
      </Select>
      <Button variant="secondary" onClick={onRefresh}>Refresh</Button>
    </div>
  );
}

