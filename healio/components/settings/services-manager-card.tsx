import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  color: string;
  isActive: boolean;
};

export function ServicesManagerCard({ items, loading, error }: { items: ServiceItem[]; loading: boolean; error: string | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle>Services</CardTitle>
          <CardDescription>Clinic service catalog used in booking and billing. Add/edit actions stay in-context via drawers in a later task.</CardDescription>
        </div>
        <Button size="sm" variant="secondary">Add Service</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</>
        ) : error ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
        ) : items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-card border border-border bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <p className="font-medium text-ink">{item.name}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Inactive"}</Badge>
                  <Badge variant="primary">{item.durationMinutes} min</Badge>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{item.description || "No description"}</p>
              <p className="mt-2 text-sm font-semibold text-ink">PHP {item.price}</p>
            </div>
          ))
        ) : (
          <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm">
            <p className="font-medium text-ink">No services yet</p>
            <p className="mt-1 text-muted">Add your first service so the booking portal can offer appointment types.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
