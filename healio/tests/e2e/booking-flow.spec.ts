import { expect, test } from "@playwright/test";

const CLINIC_SLUG = "northview-clinic";
const BASE = `/api/v1/public/clinics/${CLINIC_SLUG}`;

test("public booking flow completes with mocked API responses", async ({ page }) => {
  await page.route(new RegExp(`${BASE.replace(/\//g, "\\/")}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: "dev-clinic-northview",
          slug: CLINIC_SLUG,
          name: "Northview Family Clinic",
          logo: null,
          address: "123 Wellness Ave",
          phone: "+63 917 555 0101",
          email: "hello@northview.example",
          timezone: "Asia/Manila",
          currency: "PHP",
        },
      }),
    });
  });

  await page.route(new RegExp(`${BASE.replace(/\//g, "\\/")}\\/services$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: "svc_consult",
            name: "General Consultation",
            description: "Routine visit and symptoms review.",
            durationMinutes: 30,
            price: "800.00",
            color: "#0ea5a4",
          },
          {
            id: "svc_followup",
            name: "Follow-up Visit",
            description: "Post-treatment follow-up.",
            durationMinutes: 20,
            price: "500.00",
            color: "#0284c7",
          },
        ],
      }),
    });
  });

  await page.route(new RegExp(`${BASE.replace(/\//g, "\\/")}\\/slots\\?.*`), async (route) => {
    const url = new URL(route.request().url());
    const date = url.searchParams.get("date") ?? "2026-03-01";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          clinicSlug: CLINIC_SLUG,
          date,
          timezone: "Asia/Manila",
          service: { id: "svc_consult", name: "General Consultation", durationMinutes: 30 },
          slots: [
            {
              startTime: "2026-03-01T01:00:00.000Z",
              endTime: "2026-03-01T01:30:00.000Z",
              label: "9:00 AM",
            },
            {
              startTime: "2026-03-01T02:00:00.000Z",
              endTime: "2026-03-01T02:30:00.000Z",
              label: "10:00 AM",
            },
          ],
        },
      }),
    });
  });

  await page.route("/api/v1/public/bookings", async (route) => {
    const payload = route.request().postDataJSON() as {
      clinicSlug: string;
      serviceId: string;
      patient: { firstName: string; lastName: string };
    };

    expect(payload.clinicSlug).toBe(CLINIC_SLUG);
    expect(payload.serviceId).toBe("svc_consult");

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          bookingId: "book_e2e_001",
          appointmentId: "appt_e2e_001",
          patientId: "pat_e2e_001",
          clinicSlug: CLINIC_SLUG,
          serviceId: payload.serviceId,
          slotStartTime: "2026-03-01T01:00:00.000Z",
          slotEndTime: "2026-03-01T01:30:00.000Z",
          status: "SCHEDULED",
          idempotencyKey: "ui-e2e-idempotency",
        },
      }),
    });
  });

  await page.goto(`/book/${CLINIC_SLUG}`);

  await expect(page.getByRole("heading", { name: "Northview Family Clinic" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. Choose a service" })).toBeVisible();

  await page.getByRole("button", { name: /General Consultation/i }).click();
  await page.getByRole("button", { name: "9:00 AM" }).click();

  const continueButton = page.getByRole("button", { name: "Continue to patient details" });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  const drawer = page.getByRole("dialog", { name: "Patient details" });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("First name").fill("Ada");
  await drawer.getByLabel("Last name").fill("Lovelace");
  await drawer.getByLabel("Email").fill("ada@example.com");
  await drawer.getByLabel("Phone").fill("+63 917 123 4567");
  await drawer.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { name: "Appointment confirmed" })).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
  await expect(page.getByText("book_e2e_001")).toBeVisible();
});
