import { appRouter } from "../src/server/trpc/routers/_app";
import { prisma } from "../src/server/db";
import bcrypt from "bcryptjs";

async function runSignUpVerification() {
  console.log("==================================================");
  console.log("VERIFYING SIGN UP & REGISTRATION IN DATABASE");
  console.log("==================================================");

  const caller = appRouter.createCaller({ prisma, session: null });
  const testEmailFD = `test.frontdesk.${Date.now()}@clinic.com`;
  const testEmailDoc = `test.doctor.${Date.now()}@clinic.com`;

  // 1. Front Desk Registration
  console.log("1. Registering Front Desk user...");
  const fdUser = await caller.auth.signUp({
    name: "Alex FrontDesk Test",
    email: testEmailFD,
    password: "securePassword123",
    role: "FRONT_DESK",
  });
  console.log(`   ✔ Created Front Desk user: ${fdUser.name} (${fdUser.email}) [Role: ${fdUser.role}]`);

  // 2. Provider Registration with Specialty
  console.log("2. Registering Provider user with specialty...");
  const docUser = await caller.auth.signUp({
    name: "Dr. Evelyn Reed",
    email: testEmailDoc,
    password: "doctorSecret456",
    role: "PROVIDER",
    specialty: "Sports Medicine",
  });
  console.log(`   ✔ Created Provider: ${docUser.name} (${docUser.email}) [Role: ${docUser.role}]`);

  // 3. Duplicate Email Prevention
  console.log("3. Testing duplicate email prevention...");
  let duplicateBlocked = false;
  try {
    await caller.auth.signUp({
      name: "Another Doctor",
      email: testEmailDoc,
      password: "somePassword999",
      role: "PROVIDER",
    });
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      duplicateBlocked = true;
      console.log(`   ✔ Duplicate email correctly rejected: "${err.message}"`);
    } else {
      throw err;
    }
  }

  if (!duplicateBlocked) {
    throw new Error("Duplicate email was NOT blocked!");
  }

  // 4. Password Hash Verification
  console.log("4. Verifying bcrypt password hashing in database...");
  const dbUser = await prisma.user.findUnique({ where: { id: docUser.id } });
  if (!dbUser?.passwordHash) {
    throw new Error("Password hash not found in database!");
  }
  const isMatch = await bcrypt.compare("doctorSecret456", dbUser.passwordHash);
  if (!isMatch) {
    throw new Error("Stored password hash does not match original password!");
  }
  console.log("   ✔ Stored password hash verified with bcrypt.compare.");

  // Clean up test records
  console.log("5. Cleaning up test records...");
  await prisma.user.deleteMany({
    where: { id: { in: [fdUser.id, docUser.id] } },
  });
  console.log("   ✔ Test records cleaned up successfully.");

  console.log("==================================================");
  console.log("ALL REGISTRATION & DATABASE TESTS PASSED 100%!");
  console.log("==================================================");
}

runSignUpVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
