"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";

const quickActions = [
  {
    label: "Add Appointment",
    description: "Book a visit without leaving the schedule context.",
  },
  { label: "Add Patient", description: "Create a new patient chart in one flow." },
  { label: "Create Invoice", description: "Generate a billing draft from today’s visit." },
];

export function GlobalQuickAction() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedAction) {
        setSelectedAction(null);
        return;
      }
      if (menuOpen) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, selectedAction]);

  return (
    <>
      <div className="fixed bottom-20 right-4 z-30 lg:bottom-6 lg:right-6">
        {menuOpen ? (
          <div className="mb-3 w-72 healio-card p-3 shadow-xl">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Quick Actions
            </p>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="w-full rounded-control px-3 py-2 text-left hover:bg-slate-100"
                  onClick={() => {
                    setMenuOpen(false);
                    setSelectedAction(action.label);
                  }}
                >
                  <p className="text-sm font-semibold text-ink">{action.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">
                    {action.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Button
          size="icon"
          className="h-14 w-14 rounded-full text-xl shadow-lg shadow-primary/20"
          aria-label={menuOpen ? "Close quick actions" : "Open quick actions"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? "×" : "+"}
        </Button>
      </div>

      <Drawer
        open={selectedAction !== null}
        onClose={() => setSelectedAction(null)}
        title={selectedAction ?? "Quick Action"}
        description="Frictionless in-context workflow (Stripe-style) for fast clinic operations."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedAction(null)}>
              Close
            </Button>
            <Button onClick={() => setSelectedAction(null)}>Continue</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="healio-card p-4">
            <p className="text-sm font-semibold text-ink">{selectedAction}</p>
            <p className="mt-1 text-sm text-muted">
              This drawer keeps the dashboard visible and avoids a disruptive full-page form.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="healio-card p-4">
              <p className="text-sm font-medium text-ink">Step 1</p>
              <p className="mt-1 text-sm text-muted">Pick patient and service.</p>
            </div>
            <div className="healio-card p-4">
              <p className="text-sm font-medium text-ink">Step 2</p>
              <p className="mt-1 text-sm text-muted">Confirm details and save draft.</p>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
