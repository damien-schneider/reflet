import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { Resend } from "resend";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL ?? "";
const isProduction = process.env.NODE_ENV === "production";
const resendApiKey = process.env.RESEND_API_KEY;

export const authComponent = createClient<DataModel>(components.betterAuth);

function generateVerificationEmailHtml(
  verificationUrl: string,
  userName?: string
): string {
  const greeting = userName ? `Bonjour ${userName}` : "Bonjour";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérifiez votre email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
                ${greeting},
              </h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
                Merci de vous être inscrit sur Reflet. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.
              </p>
              <table role="presentation" style="margin: 32px 0;">
                <tr>
                  <td>
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #556b2f; color: #ffffff; text-decoration: none; font-weight: 500; border-radius: 6px; font-size: 16px;">
                      Vérifier mon email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 20px; color: #556b2f; word-break: break-all;">
                ${verificationUrl}
              </p>
              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a1a1aa;">
                Si vous n'avez pas créé de compte sur Reflet, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function createAuth(ctx: GenericCtx<DataModel>) {
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      // Only require email verification in production
      requireEmailVerification: isProduction,
      // Send verification email on signup in production
      sendOnSignUp: isProduction,
      // Automatically sign in user after email verification
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => {
        // Skip email sending in development or if Resend is not configured
        if (!isProduction) {
          // Log verification URL in development for testing
          console.log("[DEV] Email verification URL:", url);
          console.log("[DEV] User:", user.email);
          return;
        }

        if (!resend) {
          console.error(
            "Resend API key not configured. Cannot send verification email."
          );
          return;
        }

        const fromEmail =
          process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

        // Fire and forget - don't await to prevent timing attacks
        resend.emails
          .send({
            from: `Reflet <${fromEmail}>`,
            to: user.email,
            subject: "Vérifiez votre adresse email",
            html: generateVerificationEmailHtml(url, user.name),
          })
          .catch((error) => {
            console.error("Failed to send verification email:", error);
          });
      },
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
