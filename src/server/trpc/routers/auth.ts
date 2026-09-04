import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }),

  getProviders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters."),
        email: z.string().email("Invalid email address format."),
        password: z.string().min(6, "Password must be at least 6 characters."),
        role: z.enum(["FRONT_DESK", "PROVIDER"]),
        specialty: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();

      // Check if email already exists
      const existing = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email address already exists.",
        });
      }

      // Format display name: if provider and specialty specified, include specialty
      let displayName = input.name.trim();
      if (input.role === "PROVIDER" && input.specialty?.trim()) {
        const cleanSpecialty = input.specialty.trim();
        if (!displayName.toLowerCase().includes(cleanSpecialty.toLowerCase())) {
          displayName = `${displayName} (${cleanSpecialty})`;
        }
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const newUser = await ctx.prisma.user.create({
        data: {
          email,
          name: displayName,
          passwordHash,
          role: input.role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return newUser;
    }),
});

