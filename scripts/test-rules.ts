import {
  validateStatusTransition,
  InvalidStatusTransitionError,
  EarlyNoShowError,
  CancellationReasonRequiredError,
  CancellationBlockedError,
} from "../src/server/appointmentStateMachine";
import { AppointmentStatus } from "@prisma/client";

console.log("==================================================");
console.log("RUNNING AUTOMATED VERIFICATION FOR CLINIC RULES");
console.log("==================================================");

const now = new Date("2026-09-03T12:00:00Z");
const pastTime = new Date("2026-09-03T10:00:00Z");
const futureTime = new Date("2026-09-03T14:00:00Z");

// 1. Legal Forward Progression (One Step Only)
validateStatusTransition({
  fromStatus: AppointmentStatus.REQUESTED,
  targetStatus: AppointmentStatus.CONFIRMED,
  scheduledTime: futureTime,
  now,
});
console.log("✔ [Pass] REQUESTED -> CONFIRMED");

validateStatusTransition({
  fromStatus: AppointmentStatus.CONFIRMED,
  targetStatus: AppointmentStatus.CHECKED_IN,
  scheduledTime: futureTime,
  now,
});
console.log("✔ [Pass] CONFIRMED -> CHECKED_IN");

validateStatusTransition({
  fromStatus: AppointmentStatus.CHECKED_IN,
  targetStatus: AppointmentStatus.COMPLETED,
  scheduledTime: pastTime,
  now,
});
console.log("✔ [Pass] CHECKED_IN -> COMPLETED");

// 2. Reject Skipping Steps (Requested -> Checked In)
try {
  validateStatusTransition({
    fromStatus: AppointmentStatus.REQUESTED,
    targetStatus: AppointmentStatus.CHECKED_IN,
    scheduledTime: futureTime,
    now,
  });
  throw new Error("Failed: Should reject illegal skip");
} catch (e: any) {
  if (e instanceof InvalidStatusTransitionError) {
    console.log("✔ [Pass] REQUESTED -> CHECKED_IN blocked with InvalidStatusTransitionError");
  } else throw e;
}

// 3. Early No-Show Rejection
try {
  validateStatusTransition({
    fromStatus: AppointmentStatus.CONFIRMED,
    targetStatus: AppointmentStatus.NO_SHOW,
    scheduledTime: futureTime,
    now,
  });
  throw new Error("Failed: Should reject early No-Show");
} catch (e: any) {
  if (e instanceof EarlyNoShowError) {
    console.log("✔ [Pass] Early No-Show blocked with EarlyNoShowError");
  } else throw e;
}

// 4. Past No-Show Permitted
validateStatusTransition({
  fromStatus: AppointmentStatus.CONFIRMED,
  targetStatus: AppointmentStatus.NO_SHOW,
  scheduledTime: pastTime,
  now,
});
console.log("✔ [Pass] Past No-Show permitted from CONFIRMED");

// 5. Cancellation Missing Reason Rejection
try {
  validateStatusTransition({
    fromStatus: AppointmentStatus.REQUESTED,
    targetStatus: AppointmentStatus.CANCELLED,
    scheduledTime: futureTime,
    now,
    cancellationReason: "   ",
  });
  throw new Error("Failed: Should reject empty cancellation reason");
} catch (e: any) {
  if (e instanceof CancellationReasonRequiredError) {
    console.log("✔ [Pass] Empty reason cancellation blocked with CancellationReasonRequiredError");
  } else throw e;
}

// 6. Cancellation with Reason Permitted
validateStatusTransition({
  fromStatus: AppointmentStatus.REQUESTED,
  targetStatus: AppointmentStatus.CANCELLED,
  scheduledTime: futureTime,
  now,
  cancellationReason: "Patient called in with acute fever",
});
console.log("✔ [Pass] Cancellation before check-in with reason permitted");

// 7. Cancellation Blocked Post-Check-In
try {
  validateStatusTransition({
    fromStatus: AppointmentStatus.CHECKED_IN,
    targetStatus: AppointmentStatus.CANCELLED,
    scheduledTime: pastTime,
    now,
    cancellationReason: "Patient left clinic",
  });
  throw new Error("Failed: Should block cancellation once checked in");
} catch (e: any) {
  if (e instanceof CancellationBlockedError) {
    console.log("✔ [Pass] Cancellation after CHECKED_IN blocked with CancellationBlockedError");
  } else throw e;
}

// 8. Terminal State Transitions Blocked
for (const terminal of [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED]) {
  try {
    validateStatusTransition({
      fromStatus: terminal,
      targetStatus: AppointmentStatus.CONFIRMED,
      scheduledTime: futureTime,
      now,
    });
    throw new Error(`Failed: Transition from terminal ${terminal} should be blocked`);
  } catch (e: any) {
    if (e instanceof InvalidStatusTransitionError) {
      console.log(`✔ [Pass] Transition from terminal state ${terminal} blocked`);
    } else throw e;
  }
}

console.log("==================================================");
console.log("ALL CLINICAL TRANSITION RULES ARE 100% VERIFIED!");
console.log("==================================================");
