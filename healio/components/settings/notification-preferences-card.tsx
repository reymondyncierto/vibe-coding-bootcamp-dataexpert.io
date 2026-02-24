import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationPref = { key: string; label: string; enabled: boolean; description: string };

export function NotificationPreferencesCard({ items, onEdit }: { items: NotificationPref[]; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Reminder and billing notification defaults used by cron routes and outbound messaging.</CardDescription>
        </div>
        <Button size="sm" onClick={onEdit}>Edit Preferences</Button>
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
