import { PrismaClient, UserRole, SlotStatus, AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { format, subDays, addDays, subWeeks, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean existing data in logical reverse-dependency order
  await prisma.alertDismissal.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.supportingProviderAssignment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Front-Desk Staff (2 users)
  const frontDesk1 = await prisma.user.create({
    data: {
      email: "alex.frontdesk@clinic.com",
      name: "Alex Turner (Front Desk)",
      passwordHash,
      role: UserRole.FRONT_DESK,
    },
  });

  const frontDesk2 = await prisma.user.create({
    data: {
      email: "jordan.frontdesk@clinic.com",
      name: "Jordan Reed (Front Desk)",
      passwordHash,
      role: UserRole.FRONT_DESK,
    },
  });

  console.log("✓ Created 2 Front-Desk accounts");

  // 2. Create Providers (4 providers)
  const provider1 = await prisma.user.create({
    data: {
      email: "dr.smith@clinic.com",
      name: "Dr. Sarah Smith (Physical Therapy)",
      passwordHash,
      role: UserRole.PROVIDER,
    },
  });

  const provider2 = await prisma.user.create({
    data: {
      email: "dr.jones@clinic.com",
      name: "Dr. David Jones (Sports Medicine)",
      passwordHash,
      role: UserRole.PROVIDER,
    },
  });

  const provider3 = await prisma.user.create({
    data: {
      email: "dr.patel@clinic.com",
      name: "Dr. Anita Patel (Rehabilitation)",
      passwordHash,
      role: UserRole.PROVIDER,
    },
  });

  const provider4 = await prisma.user.create({
    data: {
      email: "dr.lee@clinic.com",
      name: "Dr. Michael Lee (Orthopedics)",
      passwordHash,
      role: UserRole.PROVIDER,
    },
  });

  const providers = [provider1, provider2, provider3, provider4];
  console.log("✓ Created 4 Provider accounts");

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const todayDate = new Date(todayStr);

  // Helper to create a slot + appointment + history
  async function createAppointmentRecord({
    provider,
    date,
    startTime,
    durationMinutes = 30,
    patientName,
    patientContact,
    status,
    cancellationReason = null,
    visitNote = null,
    supportingProviders = [],
    dismissedEarlier = false,
  }: {
    provider: typeof provider1;
    date: Date;
    startTime: string;
    durationMinutes?: number;
    patientName: string;
    patientContact: string;
    status: AppointmentStatus;
    cancellationReason?: string | null;
    visitNote?: string | null;
    supportingProviders?: Array<typeof provider1>;
    dismissedEarlier?: boolean;
  }) {
    // 1. Create or reuse Slot
    const slot = await prisma.slot.upsert({
      where: {
        providerId_date_startTime: {
          providerId: provider.id,
          date,
          startTime,
        },
      },
      update: {},
      create: {
        providerId: provider.id,
        date,
        startTime,
        durationMinutes,
        status: SlotStatus.ACTIVE,
      },
    });

    // 2. Create Appointment
    const appointment = await prisma.appointment.create({
      data: {
        slotId: slot.id,
        schedulingProviderId: provider.id,
        patientName,
        patientContact,
        status,
        cancellationReason,
      },
    });

    // 3. Status History
    const historyEntries: Array<{
      fromStatus: AppointmentStatus | null;
      toStatus: AppointmentStatus;
      changedByUserId: string;
      reason: string | null;
      changedAt: Date;
    }> = [
      {
        fromStatus: null,
        toStatus: AppointmentStatus.REQUESTED,
        changedByUserId: frontDesk1.id,
        reason: "Patient initial booking request.",
        changedAt: subDays(date, 3),
      },
    ];

    if (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.CHECKED_IN || status === AppointmentStatus.COMPLETED || status === AppointmentStatus.NO_SHOW) {
      historyEntries.push({
        fromStatus: AppointmentStatus.REQUESTED,
        toStatus: AppointmentStatus.CONFIRMED,
        changedByUserId: frontDesk1.id,
        reason: "Confirmed via phone reminder.",
        changedAt: subDays(date, 1),
      });
    }

    if (status === AppointmentStatus.CHECKED_IN || status === AppointmentStatus.COMPLETED) {
      historyEntries.push({
        fromStatus: AppointmentStatus.CONFIRMED,
        toStatus: AppointmentStatus.CHECKED_IN,
        changedByUserId: frontDesk2.id,
        reason: "Patient arrived and checked in at front desk.",
        changedAt: new Date(date.getTime() + 10 * 60 * 1000),
      });
    }

    if (status === AppointmentStatus.COMPLETED) {
      historyEntries.push({
        fromStatus: AppointmentStatus.CHECKED_IN,
        toStatus: AppointmentStatus.COMPLETED,
        changedByUserId: provider.id,
        reason: "Treatment session concluded.",
        changedAt: new Date(date.getTime() + (durationMinutes + 5) * 60 * 1000),
      });
    }

    if (status === AppointmentStatus.NO_SHOW) {
      historyEntries.push({
        fromStatus: AppointmentStatus.CONFIRMED,
        toStatus: AppointmentStatus.NO_SHOW,
        changedByUserId: frontDesk1.id,
        reason: "Patient did not attend; phone call went to voicemail.",
        changedAt: new Date(date.getTime() + 60 * 60 * 1000),
      });
    }

    if (status === AppointmentStatus.CANCELLED) {
      historyEntries.push({
        fromStatus: AppointmentStatus.REQUESTED,
        toStatus: AppointmentStatus.CANCELLED,
        changedByUserId: frontDesk2.id,
        reason: cancellationReason || "Patient requested cancellation.",
        changedAt: subDays(date, 1),
      });
    }

    for (const h of historyEntries) {
      await prisma.statusHistory.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedByUserId: h.changedByUserId,
          reason: h.reason,
          changedAt: h.changedAt,
        },
      });
    }

    // 4. Visit Note (if any)
    if (visitNote) {
      await prisma.visitNote.create({
        data: {
          appointmentId: appointment.id,
          authorProviderId: provider.id,
          content: visitNote,
          createdAt: new Date(date.getTime() + durationMinutes * 60 * 1000),
        },
      });
    }

    // 5. Supporting Providers
    for (const sp of supportingProviders) {
      await prisma.supportingProviderAssignment.create({
        data: {
          appointmentId: appointment.id,
          providerId: sp.id,
          assignedAt: subDays(date, 2),
        },
      });
    }

    // 6. Dismissal Record if requested
    if (dismissedEarlier) {
      const [h, m] = startTime.split(":").map(Number);
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(h, m, 0, 0);

      await prisma.alertDismissal.create({
        data: {
          appointmentId: appointment.id,
          dismissedAt: subDays(now, 1), // dismissed yesterday
          dismissedForScheduledAt: scheduledDateTime,
          dismissedByUserId: frontDesk1.id,
        },
      });
    }

    return appointment;
  }

  // --- SEED SCENARIOS ---

  // A. Alert Test Case 1: REQUESTED appointment within 24h of now (e.g. +14 hours)
  const alertTest1Time = format(addDays(now, 0), "HH:mm");
  const in18h = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const in18hDate = new Date(format(in18h, "yyyy-MM-dd"));
  const in18hTimeStr = format(in18h, "HH:mm");

  await createAppointmentRecord({
    provider: provider1,
    date: in18hDate,
    startTime: in18hTimeStr,
    patientName: "Lucas Vance (Alert Test <24h)",
    patientContact: "lucas.vance@example.com",
    status: AppointmentStatus.REQUESTED,
  });

  // A2. Another REQUESTED appointment within 24h of now (+8 hours)
  const in8h = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const in8hDate = new Date(format(in8h, "yyyy-MM-dd"));
  const in8hTimeStr = format(in8h, "HH:mm");

  await createAppointmentRecord({
    provider: provider2,
    date: in8hDate,
    startTime: in8hTimeStr,
    patientName: "Clara Oswald (Alert Test <24h)",
    patientContact: "555-0199",
    status: AppointmentStatus.REQUESTED,
  });

  // B. Alert Test Case 2: REQUESTED appointment within 1h of now that was dismissed earlier
  // It MUST reappear despite the earlier dismissal!
  const in40m = new Date(now.getTime() + 40 * 60 * 1000);
  const in40mDate = new Date(format(in40m, "yyyy-MM-dd"));
  const in40mTimeStr = format(in40m, "HH:mm");

  await createAppointmentRecord({
    provider: provider3,
    date: in40mDate,
    startTime: in40mTimeStr,
    patientName: "Arthur Dent (Alert Test <1h Reappear)",
    patientContact: "arthur.dent@example.com",
    status: AppointmentStatus.REQUESTED,
    dismissedEarlier: true,
  });

  // C. Unconfirmed appointment in future (>24h out) - should NOT trigger alert
  const in4DaysDate = new Date(format(addDays(now, 4), "yyyy-MM-dd"));
  await createAppointmentRecord({
    provider: provider4,
    date: in4DaysDate,
    startTime: "10:00",
    patientName: "Fiona Gallagher",
    patientContact: "555-0144",
    status: AppointmentStatus.REQUESTED,
  });

  // D. Today's Appointments (Checked In, Confirmed, Completed)
  await createAppointmentRecord({
    provider: provider1,
    date: todayDate,
    startTime: "08:30",
    patientName: "Eleanor Rigby",
    patientContact: "555-0101",
    status: AppointmentStatus.COMPLETED,
    visitNote: "Patient reports 50% improvement in lower back mobility. Completed lumbar stabilization drills.",
  });

  await createAppointmentRecord({
    provider: provider2,
    date: todayDate,
    startTime: "09:15",
    patientName: "Marcus Aurelius",
    patientContact: "555-0102",
    status: AppointmentStatus.CHECKED_IN,
    supportingProviders: [provider1],
  });

  await createAppointmentRecord({
    provider: provider3,
    date: todayDate,
    startTime: "11:00",
    patientName: "Sophia Loren",
    patientContact: "sophia@example.com",
    status: AppointmentStatus.CONFIRMED,
  });

  await createAppointmentRecord({
    provider: provider4,
    date: todayDate,
    startTime: "13:30",
    patientName: "Benjamin Franklin",
    patientContact: "ben@example.com",
    status: AppointmentStatus.CONFIRMED,
  });

  // E. Appointments across previous 8 weeks for dashboard statistics & no-show trends
  const pastPatientData = [
    { name: "Walter White", contact: "555-0201", status: AppointmentStatus.COMPLETED, note: "Initial physical therapy assessment completed. Range of motion within acceptable limits." },
    { name: "Jesse Pinkman", contact: "555-0202", status: AppointmentStatus.NO_SHOW, note: null },
    { name: "Skyler White", contact: "555-0203", status: AppointmentStatus.COMPLETED, note: "Rotator cuff strengthening exercises prescribed." },
    { name: "Hank Schrader", contact: "555-0204", status: AppointmentStatus.COMPLETED, note: "Post-op gait re-education progressing favorably." },
    { name: "Marie Schrader", contact: "555-0205", status: AppointmentStatus.CANCELLED, note: null, cancelReason: "Conflict with work travel." },
    { name: "Saul Goodman", contact: "555-0206", status: AppointmentStatus.NO_SHOW, note: null },
    { name: "Kim Wexler", contact: "555-0207", status: AppointmentStatus.COMPLETED, note: "Cervical spine decompression exercises tolerated well." },
    { name: "Howard Hamlin", contact: "555-0208", status: AppointmentStatus.COMPLETED, note: "Knee stability drills with resistance bands." },
    { name: "Chuck McGill", contact: "555-0209", status: AppointmentStatus.CANCELLED, note: null, cancelReason: "Acute illness; rescheduling." },
    { name: "Gustavo Fring", contact: "555-0210", status: AppointmentStatus.COMPLETED, note: "Ergonomic assessment and postural correction guidance." },
    { name: "Mike Ehrmantraut", contact: "555-0211", status: AppointmentStatus.COMPLETED, note: "Shoulder impingement ultrasound therapy completed." },
    { name: "Lalo Salamanca", contact: "555-0212", status: AppointmentStatus.NO_SHOW, note: null },
    { name: "Ignacio Varga", contact: "555-0213", status: AppointmentStatus.COMPLETED, note: "Ankle sprain rehabilitation phase 2." },
    { name: "Gale Boetticher", contact: "555-0214", status: AppointmentStatus.COMPLETED, note: "Thoracic mobility sequence taught and demonstrated." },
    { name: "Tuco Salamanca", contact: "555-0215", status: AppointmentStatus.NO_SHOW, note: null },
    { name: "Hector Salamanca", contact: "555-0216", status: AppointmentStatus.COMPLETED, note: "Neurological rehab session; fine motor finger taps." },
    { name: "Jane Margolis", contact: "555-0217", status: AppointmentStatus.COMPLETED, note: "Hip abductor strengthening program reviewed." },
    { name: "Ted Beneke", contact: "555-0218", status: AppointmentStatus.COMPLETED, note: "Cervical traction administered for 15 minutes." },
    { name: "Todd Alquist", contact: "555-0219", status: AppointmentStatus.CANCELLED, note: null, cancelReason: "Vehicle breakdown on way to clinic." },
    { name: "Andrea Cantillo", contact: "555-0220", status: AppointmentStatus.COMPLETED, note: "Core stability routine established." },
  ];

  for (let i = 0; i < pastPatientData.length; i++) {
    const p = pastPatientData[i];
    // Distribute across past 1 to 7 weeks
    const weekOffset = (i % 7) + 1;
    const pastDate = new Date(format(subWeeks(now, weekOffset), "yyyy-MM-dd"));
    const assignedProvider = providers[i % providers.length];
    const hour = 9 + (i % 7);
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;

    await createAppointmentRecord({
      provider: assignedProvider,
      date: pastDate,
      startTime: timeStr,
      patientName: p.name,
      patientContact: p.contact,
      status: p.status,
      cancellationReason: p.cancelReason,
      visitNote: p.note,
      supportingProviders: i % 3 === 0 ? [providers[(i + 1) % providers.length]] : [],
    });
  }

  // F. Upcoming Confirmed & Requested Appointments (Tomorrow & next week)
  const futurePatients = [
    { name: "Diana Prince", contact: "diana@example.com", status: AppointmentStatus.CONFIRMED, dayOffset: 1, time: "10:00" },
    { name: "Bruce Wayne", contact: "bruce@example.com", status: AppointmentStatus.CONFIRMED, dayOffset: 2, time: "11:30" },
    { name: "Clark Kent", contact: "clark@example.com", status: AppointmentStatus.CONFIRMED, dayOffset: 3, time: "14:00" },
    { name: "Barry Allen", contact: "barry@example.com", status: AppointmentStatus.REQUESTED, dayOffset: 5, time: "09:00" },
    { name: "Hal Jordan", contact: "hal@example.com", status: AppointmentStatus.REQUESTED, dayOffset: 6, time: "15:30" },
  ];

  for (let i = 0; i < futurePatients.length; i++) {
    const p = futurePatients[i];
    const futureDate = new Date(format(addDays(now, p.dayOffset), "yyyy-MM-dd"));
    const assignedProvider = providers[i % providers.length];

    await createAppointmentRecord({
      provider: assignedProvider,
      date: futureDate,
      startTime: p.time,
      patientName: p.name,
      patientContact: p.contact,
      status: p.status,
    });
  }

  // G. Create unbooked ACTIVE and ARCHIVED slots (for testing slot management & restore)
  const tomorrowDate = new Date(format(addDays(now, 1), "yyyy-MM-dd"));

  await prisma.slot.upsert({
    where: {
      providerId_date_startTime: {
        providerId: provider1.id,
        date: tomorrowDate,
        startTime: "18:00",
      },
    },
    update: {},
    create: {
      providerId: provider1.id,
      date: tomorrowDate,
      startTime: "18:00",
      durationMinutes: 30,
      status: SlotStatus.ACTIVE,
    },
  });

  await prisma.slot.upsert({
    where: {
      providerId_date_startTime: {
        providerId: provider2.id,
        date: tomorrowDate,
        startTime: "18:30",
      },
    },
    update: {},
    create: {
      providerId: provider2.id,
      date: tomorrowDate,
      startTime: "18:30",
      durationMinutes: 30,
      status: SlotStatus.ACTIVE,
    },
  });

  await prisma.slot.upsert({
    where: {
      providerId_date_startTime: {
        providerId: provider3.id,
        date: tomorrowDate,
        startTime: "19:00",
      },
    },
    update: {},
    create: {
      providerId: provider3.id,
      date: tomorrowDate,
      startTime: "19:00",
      durationMinutes: 30,
      status: SlotStatus.ARCHIVED, // archived slot for restore testing
    },
  });

  const totalUsers = await prisma.user.count();
  const totalSlots = await prisma.slot.count();
  const totalAppointments = await prisma.appointment.count();
  const totalNotes = await prisma.visitNote.count();
  const totalHistory = await prisma.statusHistory.count();

  console.log("------------------------------------------");
  console.log("✅ Seed completed successfully!");
  console.log(`Users: ${totalUsers} (2 Front Desk, 4 Providers)`);
  console.log(`Slots: ${totalSlots}`);
  console.log(`Appointments: ${totalAppointments}`);
  console.log(`Visit Notes: ${totalNotes}`);
  console.log(`Status History Records: ${totalHistory}`);
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
