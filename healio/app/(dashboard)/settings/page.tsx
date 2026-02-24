"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiFailure, ApiSuccess } from "@/lib/api-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { ClinicProfileCard, type ClinicSettingsView } from "@/components/settings/clinic-profile-card";
import { OperatingHoursCard } from "@/components/settings/operating-hours-card";
import { ServicesManagerCard } from "@/components/settings/services-manager-card";
import { StaffManagerCard } from "@/components/settings/staff-manager-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  color: string;
  isActive: boolean;
};

type StaffItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  specialization: string | null;
};

type SettingsPayload = {
  clinic: ClinicSettingsView | null;
  services: ServiceItem[];
  staff: StaffItem[];
};

type DrawerMode = null | "profile" | "hours" | "notifications";

function localAuthHeaders() {
  if (typeof window === "undefined") return {} as HeadersInit;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocal) return {};
  return {
    "x-healio-clinic-id": "clinic_1",
    "x-healio-user-id": "user_owner_1",
    "x-healio-role": "OWNER",
  };
}

export default function SettingsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clinicError, setClinicError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [data, setData] = useState<SettingsPayload>({ clinic: null, services: [], staff: [] });
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [notificationPrefs, setNotificationPrefs] = useState([
    { key: "reminder_24h_email", label: "24-hour email reminders", enabled: true, description: "Email reminders before scheduled appointments." },
    { key: "reminder_1h_sms", label: "1-hour SMS reminders", enabled: true, description: "Short SMS reminders for same-day attendance." },
    { key: "invoice_email", label: "Invoice email sends", enabled: true, description: "Allow front desk to send invoice links by email." },
    { key: "staff_invite_email", label: "Staff invite emails", enabled: true, description: "Send invite links to staff members when added." },
  ]);

  async function loadSettings() {
    setLoading(true);
    setClinicError(null);
    setServicesError(null);
    setStaffError(null);

    const headers = { ...localAuthHeaders() };

    const [clinicRes, servicesRes, staffRes] = await Promise.all([
      fetch("/api/v1/clinics", { headers, cache: "no-store" }).catch((e) => e as Error),
      fetch("/api/v1/services?includeInactive=true", { headers, cache: "no-store" }).catch((e) => e as Error),
      fetch("/api/v1/staff", { headers, cache: "no-store" }).catch((e) => e as Error),
    ]);

    const next: SettingsPayload = { clinic: null, services: [], staff: [] };

    if (clinicRes instanceof Error) {
      setClinicError(clinicRes.message);
    } else {
      const json = (await clinicRes.json()) as ApiSuccess<ClinicSettingsView> | ApiFailure;
      if (!clinicRes.ok || !json.success) setClinicError(!json.success ? json.error.message : "Unable to load clinic settings.");
      else next.clinic = json.data;
    }

    if (servicesRes instanceof Error) {
      setServicesError(servicesRes.message);
    } else {
      const json = (await servicesRes.json()) as ApiSuccess<{ items: ServiceItem[] }> | ApiFailure;
      if (!servicesRes.ok || !json.success) setServicesError(!json.success ? json.error.message : "Unable to load services.");
      else next.services = json.data.items;
    }

    if (staffRes instanceof Error) {
      setStaffError(staffRes.message);
    } else {
      const json = (await staffRes.json()) as ApiSuccess<{ items: StaffItem[] }> | ApiFailure;
      if (!staffRes.ok || !json.success) setStaffError(!json.success ? json.error.message : "Unable to load staff.");
      else next.staff = json.data.items;
    }

    setData(next);
    setLoading(false);
  }

  useEffect(() => {
    loadSettings().catch((error) => {
      pushToast({ title: "Settings load failed", description: error instanceof Error ? error.message : "Unknown error", variant: "error" });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeServicesCount = useMemo(() => data.services.filter((s) => s.isActive).length, [data.services]);
  const invitedCount = useMemo(() => data.staff.filter((s) => s.status === "INVITED").length, [data.staff]);

  const drawerTitle = drawer === "profile" ? "Edit Clinic Profile" : drawer === "hours" ? "Edit Operating Hours" : drawer === "notifications" ? "Edit Notification Preferences" : "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Clinic Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Settings Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Bento-style settings dashboard for profile, hours, services, staff, and outbound messaging preferences. Primary edits stay in slide-out drawers so the front desk never loses context.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">{activeServicesCount} Active Services</Badge>
          <Badge variant={invitedCount > 0 ? "warning" : "success"}>{invitedCount} Pending Invites</Badge>
          <Button variant="secondary" onClick={() => void loadSettings()}>Refresh Data</Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-6">
          <ClinicProfileCard clinic={data.clinic} loading={loading} error={clinicError} onEdit={() => setDrawer("profile")} onRefresh={() => void loadSettings()} />
          <ServicesManagerCard items={data.services} loading={loading} error={servicesError} />
          <StaffManagerCard items={data.staff} loading={loading} error={staffError} />
        </div>
        <div className="space-y-6">
          <OperatingHoursCard rows={data.clinic?.operatingHours ?? []} loading={loading} onEdit={() => setDrawer("hours")} />
          <NotificationPreferencesCard items={notificationPrefs} onEdit={() => setDrawer("notifications")} />
          <div className="rounded-card border border-dashed border-border bg-app/40 p-4 text-sm">
            <p className="font-medium text-ink">Onboarding tip</p>
            <p className="mt-1 text-muted">Start by confirming clinic hours and services, then invite your first front desk staff member so scheduling and billing can happen in parallel.</p>
          </div>
        </div>
      </div>

      <Drawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        title={drawerTitle}
        description="Draft changes in-context. Persist/save flows are completed in later settings tasks."
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={() => { pushToast({ title: "Saved locally", description: "This drawer is a UX shell for the next task's save flow.", variant: "success" }); setDrawer(null); }}>Save Draft</Button></div>}
      >
        {drawer === "profile" && data.clinic ? (
          <div className="space-y-4">
            <Input name="clinic-name" defaultValue={data.clinic.name} placeholder="Clinic name" />
            <Input name="clinic-email" defaultValue={data.clinic.email} placeholder="Email" />
            <Input name="clinic-phone" defaultValue={data.clinic.phone ?? ""} placeholder="Phone" />
            <Input name="clinic-address" defaultValue={data.clinic.address ?? ""} placeholder="Address" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="clinic-timezone" defaultValue={data.clinic.timezone} placeholder="Timezone" />
              <Select name="clinic-currency" defaultValue={data.clinic.currency}>
                <option value="PHP">PHP</option>
                <option value="USD">USD</option>
              </Select>
            </div>
          </div>
        ) : null}
        {drawer === "hours" ? (
          <div className="space-y-3">
            {(data.clinic?.operatingHours ?? []).slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((row) => (
              <div key={row.dayOfWeek} className="grid grid-cols-[70px_1fr_1fr] items-center gap-2">
                <span className="text-sm font-medium text-ink">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][row.dayOfWeek]}</span>
                <Input name={`open-${row.dayOfWeek}`} defaultValue={row.openTime} disabled={row.isClosed} />
                <Input name={`close-${row.dayOfWeek}`} defaultValue={row.closeTime} disabled={row.isClosed} />
              </div>
            ))}
          </div>
        ) : null}
        {drawer === "notifications" ? (
          <div className="space-y-3">
            {notificationPrefs.map((pref) => (
              <label key={pref.key} className="flex items-start justify-between gap-3 rounded-card border border-border bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-ink">{pref.label}</p>
                  <p className="text-xs text-muted">{pref.description}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={pref.enabled}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setNotificationPrefs((items) =>
                      items.map((item) => (item.key === pref.key ? { ...item, enabled: checked } : item)),
                    );
                  }}
                />
              </label>
            ))}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
