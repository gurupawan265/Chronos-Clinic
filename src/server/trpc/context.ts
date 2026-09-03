import { getServerAuthSession } from "@/server/auth";
import { prisma } from "@/server/db";
import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createTRPCContext(opts?: FetchCreateContextFnOptions) {
  const session = await getServerAuthSession();

  return {
    session,
    prisma,
    headers: opts?.req?.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
