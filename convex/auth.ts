import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Email({
      id: "resend",
      name: "Human MCP",
      authorize: undefined,
      maxAge: 15 * 60,
      async sendVerificationRequest({ identifier, url }) {
        const apiKey = process.env.RESEND_API_KEY,
          from = process.env.RESEND_FROM_EMAIL;
        if (!apiKey || !from)
          throw new Error(
            "Email sign-in is not configured. Ask the owner to configure Resend.",
          );
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: identifier,
            subject: "Sign in to Human MCP",
            text: `Sign in to Human MCP using this link. It expires in 15 minutes.\n\n${url}\n\nIf you did not request this link, ignore this email.`,
          }),
        });
        if (!response.ok)
          throw new Error(
            "The sign-in email could not be sent. Try again later.",
          );
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const base = process.env.SITE_URL ?? "http://localhost:5173";
      if (!redirectTo) return base;
      const url = new URL(redirectTo, base);
      if (url.origin !== new URL(base).origin)
        throw new Error("Sign-in redirect is not allowed.");
      return url.toString();
    },
  },
});
