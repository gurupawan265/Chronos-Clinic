import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@clinic.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user) {
          throw new Error("Invalid email or password.");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error("Invalid email or password.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const isProd = process.env.NODE_ENV === "production";
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
      const effectiveBaseUrl =
        isProd && vercelUrl && baseUrl.includes("localhost")
          ? vercelUrl
          : baseUrl;

      if (url.startsWith("/")) {
        return `${effectiveBaseUrl.replace(/\/+$/, "")}${url}`;
      }
      try {
        const parsedUrl = new URL(url);
        if (
          isProd &&
          (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") &&
          vercelUrl
        ) {
          return `${vercelUrl}${parsedUrl.pathname}${parsedUrl.search}`;
        }
        return url;
      } catch {
        return effectiveBaseUrl;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "chronos_clinic_development_secret_key_minimum_32_characters",
};

export const getServerAuthSession = () => getServerSession(authOptions);
