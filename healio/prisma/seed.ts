async function main() {
  const dryRun =
    process.argv.includes("--dry-run") || process.env.SEED_DRY_RUN === "1";

  const clinicSeed = {
    slug: "northview-clinic",
    name: "Northview Clinic",
    email: "hello@northview.example.com",
    timezone: "Asia/Manila",
    currency: "PHP" as const,
    address: "123 Mabini St, Manila",
    phone: "+63 917 000 0000",
    subscriptionTier: "STARTER" as const,
  };

  const services = [
    {
      name: "General Consultation",
      description: "Primary care consultation for new or returning patients.",
      durationMinutes: 30,
      price: "1200.00",
      color: "#0EA5A4",
    },
    {
      name: "Follow-up Consultation",
      description: "Short follow-up visit for review and care adjustments.",
      durationMinutes: 20,
      price: "800.00",
      color: "#2563EB",
    },
    {
      name: "Physical Therapy Session",
      description: "Supervised rehab or mobility treatment session.",
      durationMinutes: 60,
      price: "1800.00",
      color: "#16A34A",
    },
  ] as const;

  const operatingHours = [
    { dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 4, openTime: "09:00", closeTime: "17:00", isClosed: false },
    { dayOfWeek: 5, openTime: "09:00", closeTime: "13:00", isClosed: false },
    { dayOfWeek: 6, openTime: "00:00", closeTime: "00:00", isClosed: true },
  ] as const;

  const staffSeeds = [
    {
      supabaseUserId: "seed-owner-user",
      name: "Dr. Andrea Reyes",
      email: "owner@northview.example.com",
      role: "OWNER" as const,
      specialization: "General Practitioner",
    },
    {
      supabaseUserId: "seed-doctor-user",
      name: "Dr. Marco Santos",
      email: "doctor@northview.example.com",
      role: "DOCTOR" as const,
      specialization: "Family Medicine",
    },
    {
      supabaseUserId: "seed-reception-user",
      name: "Lia Cruz",
      email: "reception@northview.example.com",
      role: "RECEPTIONIST" as const,
      specialization: null,
    },
  ] as const;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          clinic: clinicSeed.slug,
          staffCount: staffSeeds.length,
          serviceCount: services.length,
          operatingHoursCount: operatingHours.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const clinic = await prisma.clinic.upsert({
      where: { slug: clinicSeed.slug },
      update: {
        ...clinicSeed,
      },
      create: {
        ...clinicSeed,
      },
    });

    for (const staff of staffSeeds) {
      await prisma.staff.upsert({
        where: { supabaseUserId: staff.supabaseUserId },
        update: {
          clinicId: clinic.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          specialization: staff.specialization ?? undefined,
          isActive: true,
        },
        create: {
          clinicId: clinic.id,
          supabaseUserId: staff.supabaseUserId,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          specialization: staff.specialization ?? undefined,
        },
      });
    }

    for (const service of services) {
      await prisma.service.upsert({
        where: {
          clinicId_name: {
            clinicId: clinic.id,
            name: service.name,
          },
        },
        update: {
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: service.price,
          color: service.color,
          isActive: true,
          deletedAt: null,
        },
        create: {
          clinicId: clinic.id,
          ...service,
        },
      });
    }

    for (const row of operatingHours) {
      await prisma.operatingHours.upsert({
        where: {
          clinicId_dayOfWeek: {
            clinicId: clinic.id,
            dayOfWeek: row.dayOfWeek,
          },
        },
        update: row,
        create: {
          clinicId: clinic.id,
          ...row,
        },
      });
    }

    console.log(
      `Seeded ${clinic.slug}: ${staffSeeds.length} staff, ${services.length} services, ${operatingHours.length} operating-hour rows.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
