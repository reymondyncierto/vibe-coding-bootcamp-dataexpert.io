"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TabId = "overview" | "visits" | "documents";

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  {
    id: "overview",
    label: "Overview",
    description: "Chart summary is ready. Use the cards above to confirm demographics and medical context.",
  },
  {
    id: "visits",
    label: "Visits",
    description: "SOAP notes and amendment history will appear here (HEALIO-040).",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Upload list and preview workflow will appear here (HEALIO-041).",
  },
];

export function PatientProfileTabs({
  visitsContent,
  documentsContent,
}: {
  visitsContent?: ReactNode;
  documentsContent?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const active = tabs.find((item) => item.id === activeTab) ?? tabs[0];

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div
          className="inline-flex flex-wrap rounded-card border border-border bg-surface p-1 shadow-sm"
          role="tablist"
          aria-label="Patient profile sections"
        >
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={tab.id === activeTab ? "primary" : "ghost"}
              role="tab"
              aria-selected={tab.id === activeTab}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="rounded-card border border-border bg-app/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{active.label}</p>
            <Badge variant={active.id === "overview" ? "success" : "neutral"}>
              {active.id === "overview" ? "Ready" : "Coming next"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{active.description}</p>

          {active.id === "visits" && visitsContent ? (
            <div className="mt-4">{visitsContent}</div>
          ) : active.id === "documents" && documentsContent ? (
            <div className="mt-4">{documentsContent}</div>
          ) : active.id !== "overview" ? (
            <div className="mt-4 rounded-control border border-dashed border-border bg-white px-3 py-3 text-sm text-muted">
              Empty state scaffold is intentional so new clinics are not shown a blank area while the next patient-chart tabs are implemented.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-control border border-border bg-white px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Next Best Action</p>
                <p className="mt-1 text-sm text-ink">
                  Open the edit drawer to confirm demographics without leaving the patient chart.
                </p>
              </div>
              <div className="rounded-control border border-border bg-white px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Workflow Note</p>
                <p className="mt-1 text-sm text-ink">
                  Visits and documents stay in tabs so staff can scan context before switching tasks.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
