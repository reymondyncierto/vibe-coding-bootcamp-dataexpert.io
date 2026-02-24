import type { PublicClinicProfile, PublicService } from "@/schemas/clinic";

const DEV_FALLBACK_CLINIC: PublicClinicProfile = {
  id: "dev-clinic-northview",
  slug: "northview-clinic",
  name: "Northview Clinic",
  logo: null,
  address: "123 Mabini St, Manila",
  phone: "+63 917 000 0000",
  email: "hello@northview.example.com",
  timezone: "Asia/Manila",
  currency: "PHP",
};

const DEV_FALLBACK_SERVICES: PublicService[] = [
  {
    id: "svc-general-consult",
    name: "General Consultation",
    description: "Primary care consultation for new or returning patients.",
    durationMinutes: 30,
    price: "1200.00",
    color: "#0EA5A4",
  },
  {
    id: "svc-follow-up",
    name: "Follow-up Consultation",
    description: "Short follow-up visit for review and care adjustments.",
    durationMinutes: 20,
    price: "800.00",
    color: "#2563EB",
  },
  {
    id: "svc-pt",
    name: "Physical Therapy Session",
    description: "Supervised rehab or mobility treatment session.",
    durationMinutes: 60,
    price: "1800.00",
    color: "#16A34A",
  },
];

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: { toFixed: (fractionDigits?: number) => string };
  color: string;
};

async function getPrismaClient() {
  try {
    const mod = await import("@/lib/prisma");
    return mod.prisma;
  } catch {
    return null;
  }
}

function useDevFallback() {
  return process.env.NODE_ENV !== "production";
}

export async function getPublicClinicProfileBySlug(
  slug: string,
): Promise<PublicClinicProfile | null> {
  const prisma = await getPrismaClient();
  if (!prisma) {
    if (useDevFallback() && slug === DEV_FALLBACK_CLINIC.slug) {
      return DEV_FALLBACK_CLINIC;
    }
    return null;
  }

  try {
    const clinic = await prisma.clinic.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        address: true,
        phone: true,
        email: true,
        timezone: true,
        currency: true,
      },
    });

    if (!clinic) {
      return null;
    }

    return {
      ...clinic,
      currency: clinic.currency as PublicClinicProfile["currency"],
    };
  } catch {
    if (useDevFallback() && slug === DEV_FALLBACK_CLINIC.slug) {
      return DEV_FALLBACK_CLINIC;
    }
    return null;
  }
}

export async function getPublicServicesByClinicSlug(
  slug: string,
): Promise<PublicService[] | null> {
  const prisma = await getPrismaClient();
  if (!prisma) {
    if (useDevFallback() && slug === DEV_FALLBACK_CLINIC.slug) {
      return DEV_FALLBACK_SERVICES;
    }
    return null;
  }

  try {
    const clinic = await prisma.clinic.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!clinic) return null;

    const services = await prisma.service.findMany({
      where: {
        clinicId: clinic.id,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        price: true,
        color: true,
      },
    });

    return (services as ServiceRow[]).map((service) => ({
      ...service,
      price: service.price.toFixed(2),
    }));
  } catch {
    if (useDevFallback() && slug === DEV_FALLBACK_CLINIC.slug) {
      return DEV_FALLBACK_SERVICES;
    }
    return null;
  }
}
