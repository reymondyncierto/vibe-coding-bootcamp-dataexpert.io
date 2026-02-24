"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { Modal, ModalBody } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast-provider";

export default function HomePage() {
  return (
    <ToastProvider>
      <PrimitivesShowcase />
    </ToastProvider>
  );
}

function PrimitivesShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { pushToast } = useToast();

  return (
    <main className="min-h-screen bg-app px-6 py-12 text-ink">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-8">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            Healio
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Core UI primitives ready
          </h1>
          <p className="mt-4 max-w-prose text-base leading-7 text-muted">
            Paper-friendly buttons, cards, inputs, select controls, and badges
            are now available for upcoming scheduling, patients, and billing
            workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="primary">Trust Accent</Badge>
            <Badge variant="success">Paid</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="danger">Overdue</Badge>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button>Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Saving</Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Open Modal
            </Button>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(true)}>
              Open Drawer
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                pushToast({
                  title: "Reminder queued",
                  description: "SMS reminder will be sent at 5:00 PM.",
                  variant: "success",
                })
              }
            >
              Show Toast
            </Button>
          </div>
        </Card>

        <aside className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Intake Controls</CardTitle>
              <CardDescription>
                Large, forgiving inputs and clear affordances for reception-side
                workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block">
                <span className="healio-label">Patient Name</span>
                <Input
                  className="mt-1"
                  placeholder="e.g., Maria Santos"
                  aria-label="Patient Name"
                  name="patientName"
                />
              </label>
              <label className="block">
                <span className="healio-label">Visit Type</span>
                <Select
                  className="mt-1"
                  aria-label="Visit Type"
                  defaultValue=""
                  name="visitType"
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option>Consultation</option>
                  <option>Follow-up</option>
                  <option>Physical Therapy</option>
                </Select>
              </label>
              <label className="block">
                <span className="healio-label">Phone</span>
                <Input
                  className="mt-1"
                  placeholder="+63 912 345 6789"
                  hasError
                  defaultValue="+63 912"
                  name="phone"
                  aria-invalid="true"
                  aria-describedby="phone-error"
                />
                <p id="phone-error" className="mt-1 text-xs text-danger">
                  Enter the full number to send reminders.
                </p>
              </label>
            </CardContent>
            <CardFooter>
              <Button className="flex-1 sm:flex-none">Save Patient</Button>
              <Button variant="secondary" className="flex-1 sm:flex-none">
                Create Invoice
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accessibility Base</CardTitle>
              <CardDescription>
                Focus rings, reduced-motion fallbacks, and state variants are
                ready for upcoming modals and drawers.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <a
                className="inline-flex min-h-11 items-center rounded-control border border-border px-4 py-2 text-sm font-medium text-ink"
                href="#"
              >
                Focus me with Tab
              </a>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Appointment"
        description="Stripe-style centered workflow for quick booking edits."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsModalOpen(false);
                pushToast({
                  title: "Appointment draft saved",
                  description: "You can finish details in the drawer later.",
                  variant: "info",
                });
              }}
            >
              Save Draft
            </Button>
          </div>
        }
      >
        <ModalBody>
          <label className="block">
            <span className="healio-label">Patient Name</span>
            <Input className="mt-1" defaultValue="Maria Santos" name="modalPatientName" />
          </label>
          <label className="block">
            <span className="healio-label">Service</span>
            <Select className="mt-1" defaultValue="Consultation" name="modalService">
              <option>Consultation</option>
              <option>Follow-up</option>
              <option>Physical Therapy</option>
            </Select>
          </label>
        </ModalBody>
      </Modal>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Invoice"
        description="Side drawer workflow keeps the schedule visible while billing."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() =>
                pushToast({
                  title: "Invoice queued",
                  description: "Draft invoice created for today's visit.",
                  variant: "warning",
                })
              }
            >
              Create Draft Invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="healio-card p-4">
            <p className="text-sm font-semibold text-ink">Invoice Preview</p>
            <p className="mt-1 text-sm text-muted">Patient: Maria Santos</p>
            <p className="text-sm text-muted">Service: Follow-up Consultation</p>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Drawer>
    </main>
  );
}
