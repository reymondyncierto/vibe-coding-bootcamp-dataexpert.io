import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StaffItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  specialization: string | null;
};

export function StaffManagerCard({ items, loading, error }: { items: StaffItem[]; loading: boolean; error: string | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle>Staff</CardTitle>
          <CardDescription>Team roster and invite status for clinic operations and scheduling permissions.</CardDescription>
        </div>
        <Button size="sm" variant="secondary">Invite Staff</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</>
        ) : error ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
        ) : items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-card border border-border bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="text-sm text-muted">{item.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="primary">{item.role}</Badge>
                  <Badge variant={item.status === "ACTIVE" ? "success" : "warning"}>{item.status}</Badge>
                </div>
              </div>
              {item.specialization ? <p className="mt-2 text-sm text-muted">{item.specialization}</p> : null}
            </div>
          ))
        ) : (
          <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm">
            <p className="font-medium text-ink">No staff yet</p>
            <p className="mt-1 text-muted">Invite doctors or front desk staff to share scheduling and billing work.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
