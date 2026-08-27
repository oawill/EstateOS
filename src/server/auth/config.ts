import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/server/db/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// No adapter: Credentials + JWT sessions don't need one, and PrismaAdapter
// requires Account/Session/VerificationToken models we don't have yet.
// Add it (and those models) if/when an OAuth provider is introduced.
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        return token;
      }

      // Credentials + JWT has no server-side session store to revoke, so
      // this is the substitute: if the user's password changed after this
      // token was issued, the token is invalidated on its very next use.
      // Returning {} makes auth() treat the session as signed out — this
      // runs on every request that reads the session, so a password
      // change (via reset or the authenticated Change Password flow)
      // takes effect everywhere within one request, not just on next login.
      if (token.userId && typeof token.iat === "number") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { passwordChangedAt: true },
        });
        if (dbUser?.passwordChangedAt && dbUser.passwordChangedAt.getTime() / 1000 > token.iat) {
          return {};
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
