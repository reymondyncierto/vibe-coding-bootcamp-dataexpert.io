"use client";

import { useState } from "react";

import { DailySchedule } from "@/components/appointments/daily-schedule";
import { WeeklyCalendar } from "@/components/appointments/weekly-calendar";
import { Button } from "@/components/ui/button";

type ViewMode = "day" | "week";

export default function AppointmentsPage() {
  const [view, setView] = useState<ViewMode>("day");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Appointment Views
          </p>
          <p className="mt-1 text-sm text-muted">
            Switch between timeline and weekly grid without leaving the dashboard context.
          </p>
        </div>
        <div
          className="inline-flex rounded-card border border-border bg-surface p-1 shadow-sm"
          role="tablist"
          aria-label="Appointment dashboard views"
        >
          <Button
            type="button"
            variant={view === "day" ? "primary" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={view === "day"}
            onClick={() => setView("day")}
          >
            Day View
          </Button>
          <Button
            type="button"
            variant={view === "week" ? "primary" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={view === "week"}
            onClick={() => setView("week")}
          >
            Week View
          </Button>
        </div>
      </div>

      {view === "day" ? <DailySchedule /> : <WeeklyCalendar />}
    </div>
  );
}
