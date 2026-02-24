import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ClinicSettingsView = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string;
  timezone: string;
  currency: "PHP" | "USD";
  isPublicBookingEnabled: boolean;
  bookingRules: {
    leadTimeMinutes: number;
    maxAdvanceDays: number;
    slotStepMinutes: number;
    requirePhoneForBooking: boolean;
    allowCancellationFromPublicLink: boolean;
  };
  operatingHours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>;
  updatedAt: string;
};

type Props = {
  clinic: ClinicSettingsView | null;
  loading: boolean;
  error: string | null;
  onEdit: () => void;
  onRefresh: () => void;
};

export function ClinicProfileCard({ clinic, loading, error, onEdit, onRefresh }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle>Clinic Profile</CardTitle>
          <CardDescription>Core identity and booking defaults used across public booking and staff workflows.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onRefresh}>Refresh</Button>
          <Button size="sm" onClick={onEdit}>Edit Profile</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-20 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : error ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
        ) : clinic ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={clinic.isPublicBookingEnabled ? "success" : "warning"}>{clinic.isPublicBookingEnabled ? "Public Booking On" : "Public Booking Off"}</Badge>
              <Badge variant="neutral">{clinic.timezone}</Badge>
              <Badge variant="primary">{clinic.currency}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBlock label="Clinic Name" value={clinic.name} />
              <InfoBlock label="Booking URL" value={`/book/${clinic.slug}`} />
              <InfoBlock label="Email" value={clinic.email} />
              <InfoBlock label="Phone" value={clinic.phone || "Not set"} muted={!clinic.phone} />
              <InfoBlock label="Address" value={clinic.address || "Not set"} muted={!clinic.address} className="sm:col-span-2" />
            </div>
            <div className="rounded-card border border-border bg-app/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Booking Rules Snapshot</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <span>Lead time: <strong>{clinic.bookingRules.leadTimeMinutes} min</strong></span>
                <span>Advance: <strong>{clinic.bookingRules.maxAdvanceDays} days</strong></span>
                <span>Slot step: <strong>{clinic.bookingRules.slotStepMinutes} min</strong></span>
                <span>Phone required: <strong>{clinic.bookingRules.requirePhoneForBooking ? "Yes" : "No"}</strong></span>
                <span className="lg:col-span-2">Public cancellation link: <strong>{clinic.bookingRules.allowCancellationFromPublicLink ? "Enabled" : "Disabled"}</strong></span>
              </div>
            </div>
          </>
        ) : (
          <EmptyState label="No clinic settings found" detail="Refresh to load the clinic profile and booking configuration." />
        )}
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value, muted, className }: { label: string; value: string; muted?: boolean; className?: string }) {
  return (
    <div className={`rounded-card border border-border bg-white p-3 ${className ?? ""}`.trim()}>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-sm ${muted ? "text-muted" : "font-medium text-ink"}`}>{value}</p>
    </div>
  );
}

function EmptyState({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm">
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-1 text-muted">{detail}</p>
    </div>
  );
}
