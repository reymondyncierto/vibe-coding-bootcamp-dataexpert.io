import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationPref = { key: string; label: string; enabled: boolean; description: string };

export function NotificationPreferencesCard({ items, onEdit }: { items: NotificationPref[]; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Reminder and billing notification defaults used by cron routes and outbound messaging.</CardDescription>
          </div>
          <div className="w-full sm:w-auto sm:self-start">
            <Button className="w-full whitespace-nowrap sm:w-auto sm:shrink-0" size="sm" onClick={onEdit}>Edit Preferences</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-start justify-between gap-3 rounded-card border border-border bg-white px-3 py-2">
            <div>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="text-xs text-muted">{item.description}</p>
            </div>
            <span className={`mt-0.5 inline-flex rounded-full px-2 py-1 text-xs font-medium ${item.enabled ? 'bg-success/10 text-success border border-success/20' : 'bg-slate-100 text-muted border border-border'}`}>
              {item.enabled ? "On" : "Off"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
