import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type HoursRow = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function OperatingHoursCard({ rows, loading, onEdit }: { rows: HoursRow[]; loading: boolean; onEdit: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
          <CardTitle>Operating Hours</CardTitle>
          <CardDescription>Quick scan of weekly clinic availability used by the slot engine and public booking.</CardDescription>
          </div>
          <div className="w-full sm:w-auto sm:self-start">
            <Button className="w-full whitespace-nowrap sm:w-auto sm:shrink-0" size="sm" onClick={onEdit}>Edit Hours</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((row) => (
              <div key={row.dayOfWeek} className="flex items-center justify-between rounded-card border border-border bg-white px-3 py-2 text-sm">
                <span className="font-medium text-ink">{dayNames[row.dayOfWeek]}</span>
                <span className={row.isClosed ? "text-muted" : "text-ink"}>{row.isClosed ? "Closed" : `${row.openTime} - ${row.closeTime}`}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm text-muted">No hours configured yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
