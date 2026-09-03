import { AppointmentStatus, PrismaClient } from "@prisma/client";

// Custom Named Errors
export class InvalidStatusTransitionError extends Error {
  public fromStatus: AppointmentStatus;
  public targetStatus: AppointmentStatus;

  constructor(fromStatus: AppointmentStatus, targetStatus: AppointmentStatus, customMessage?: string) {
    super(
      customMessage ||
        `Illegal status transition: cannot move appointment from ${fromStatus} to ${targetStatus}. Progression allows one step forward only (REQUESTED → CONFIRMED → CHECKED_IN → COMPLETED), NO_SHOW only from CONFIRMED after scheduled time, and CANCELLED only before check-in.`
    );
    this.name = "InvalidStatusTransitionError";
    this.fromStatus = fromStatus;
    this.targetStatus = targetStatus;
  }
}

export class EarlyNoShowError extends Error {
  public scheduledTime: Date;

  constructor(scheduledTime: Date) {
    super(
      `Cannot mark as No Show before the scheduled appointment time (${scheduledTime.toLocaleString()}). No Show is only reachable after the slot's start time has passed.`
    );
    this.name = "EarlyNoShowError";
    this.scheduledTime = scheduledTime;
  }
}

export class CancellationReasonRequiredError extends Error {
  constructor() {
    super("A non-empty cancellation reason must be provided when cancelling an appointment.");
    this.name = "CancellationReasonRequiredError";
  }
}

export class CancellationBlockedError extends Error {
  public currentStatus: AppointmentStatus;

  constructor(currentStatus: AppointmentStatus) {
    super(
      `Cancellation is not permitted once an appointment has reached ${currentStatus}. Appointments can only be cancelled before check-in.`
    );
    this.name = "CancellationBlockedError";
    this.currentStatus = currentStatus;
  }
}

/**
 * Explicit State Transition Map
 * Defines every legal target state reachable from any given current state.
 *
 * Rules:
 * 1. Progression: REQUESTED → CONFIRMED → CHECKED_IN → COMPLETED (one step forward only).
 * 2. NO_SHOW: Reachable only from CONFIRMED (subject to scheduledStartTime < now guard).
 * 3. CANCELLED: Reachable only before CHECKED_IN (i.e. from REQUESTED or CONFIRMED; blocked once checked in).
 * 4. Terminal states (COMPLETED, NO_SHOW, CANCELLED) have zero legal transitions.
 */
export const LEGAL_TRANSITIONS_MAP: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  [AppointmentStatus.REQUESTED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CHECKED_IN]: [
    AppointmentStatus.COMPLETED,
  ],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.NO_SHOW]: [],
  [AppointmentStatus.CANCELLED]: [],
} as const;

export interface TransitionValidationParams {
  fromStatus: AppointmentStatus;
  targetStatus: AppointmentStatus;
  scheduledTime: Date;
  now?: Date;
  cancellationReason?: string | null;
}

/**
 * Validates a proposed state transition against the explicit transition map
 * and contextual guards (scheduled time check for No-Show, reason check for Cancellation).
 */
export function validateStatusTransition({
  fromStatus,
  targetStatus,
  scheduledTime,
  now = new Date(),
  cancellationReason,
}: TransitionValidationParams): void {
  // 1. Same status is a no-op / illegal move
  if (fromStatus === targetStatus) {
    throw new InvalidStatusTransitionError(
      fromStatus,
      targetStatus,
      `Appointment is already in ${fromStatus} status.`
    );
  }

  // 2. Check if target status exists in the explicit transition map for fromStatus
  const allowedTargets = LEGAL_TRANSITIONS_MAP[fromStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    // Specifically report cancellation blocked after check-in
    if (targetStatus === AppointmentStatus.CANCELLED && (fromStatus === AppointmentStatus.CHECKED_IN || fromStatus === AppointmentStatus.COMPLETED)) {
      throw new CancellationBlockedError(fromStatus);
    }

    throw new InvalidStatusTransitionError(
      fromStatus,
      targetStatus,
      `Illegal transition from ${fromStatus} to ${targetStatus}. Legal next steps from ${fromStatus}: [${allowedTargets.join(", ") || "None (Terminal State)"}].`
    );
  }

  // 3. Contextual Guard: NO_SHOW requires scheduledStartTime < now
  if (targetStatus === AppointmentStatus.NO_SHOW) {
    if (fromStatus !== AppointmentStatus.CONFIRMED) {
      throw new InvalidStatusTransitionError(
        fromStatus,
        targetStatus,
        "NO_SHOW is only reachable from CONFIRMED."
      );
    }
    if (now.getTime() <= scheduledTime.getTime()) {
      throw new EarlyNoShowError(scheduledTime);
    }
  }

  // 4. Contextual Guard: CANCELLED requires non-empty cancellationReason
  if (targetStatus === AppointmentStatus.CANCELLED) {
    if (!cancellationReason || cancellationReason.trim() === "") {
      throw new CancellationReasonRequiredError();
    }
  }
}

/**
 * Helper to compute the exact scheduled Date from slot date and startTime ("HH:mm")
 */
export function getSlotScheduledDateTime(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(":").map(Number);
  const scheduled = new Date(date);
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled;
}

export interface TransitionStatusParams {
  appointmentId: string;
  targetStatus: AppointmentStatus;
  userId: string;
  cancellationReason?: string | null;
  prisma: PrismaClient;
  now?: Date;
}

/**
 * Core state transition executor:
 * 1. Loads appointment and slot
 * 2. Runs validateStatusTransition with explicit map
 * 3. Writes append-only StatusHistory
 * 4. Updates Appointment status atomically
 */
export async function transitionStatus({
  appointmentId,
  targetStatus,
  userId,
  cancellationReason,
  prisma,
  now = new Date(),
}: TransitionStatusParams) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      slot: true,
      supportingProviders: {
        where: { unassignedAt: null },
      },
    },
  });

  if (!appointment) {
    throw new Error(`Appointment ${appointmentId} not found.`);
  }

  const scheduledTime = getSlotScheduledDateTime(
    appointment.slot.date,
    appointment.slot.startTime
  );

  // Validate using the explicit transition map
  validateStatusTransition({
    fromStatus: appointment.status,
    targetStatus,
    scheduledTime,
    now,
    cancellationReason,
  });

  const trimmedReason =
    targetStatus === AppointmentStatus.CANCELLED
      ? cancellationReason?.trim() || null
      : null;

  // Execute database mutation and append to StatusHistory
  return prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: targetStatus,
        cancellationReason: trimmedReason ?? appointment.cancellationReason,
      },
      include: {
        slot: true,
        schedulingProvider: true,
      },
    });

    await tx.statusHistory.create({
      data: {
        appointmentId,
        fromStatus: appointment.status,
        toStatus: targetStatus,
        changedByUserId: userId,
        reason: trimmedReason,
        changedAt: now,
      },
    });

    return updated;
  });
}
