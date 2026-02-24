"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  selectedProviderId: string;
  onSelect: (providerId: string) => void;
  disabled?: boolean;
};

const PROVIDER_OPTIONS = [
  {
    id: "any",
    name: "Any available clinician",
    description: "Fastest option. Healio will match you to an available provider.",
    available: true,
  },
  {
    id: "specific",
    name: "Choose a specific clinician",
    description: "Coming soon in a later task when staff public profiles are added.",
    available: false,
  },
];

export function PublicBookingProviderSelector({
  selectedProviderId,
  onSelect,
  disabled = false,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>2. Choose a provider</CardTitle>
            <CardDescription>
              Keep it fast with “Any available” or choose a clinician when profiles are enabled.
            </CardDescription>
          </div>
          <Badge variant={selectedProviderId ? "success" : "neutral"}>
            {disabled ? "Select service first" : "Ready"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {PROVIDER_OPTIONS.map((option) => {
          const selected = selectedProviderId === option.id;
          const blocked = disabled || !option.available;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (!blocked) onSelect(option.id);
              }}
              disabled={blocked}
              aria-pressed={selected}
              className={[
                "w-full rounded-control border bg-surface p-4 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/20",
                blocked ? "cursor-not-allowed opacity-70 hover:border-border" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{option.name}</p>
                  <p className="mt-1 text-sm text-muted">{option.description}</p>
                </div>
                <Badge variant={option.available ? "neutral" : "warning"}>
                  {option.available ? "Available" : "Soon"}
                </Badge>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
