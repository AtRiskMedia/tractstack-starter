import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import fs from "fs/promises";
import path from "path";
import type { APIContext } from "@/types";
import { Resend } from "resend";
import { generateEmailHtml } from "@/utils/email-templates/html";
import { generateActivationToken } from "@/utils/tenant/getActivationToken";

// Initialize email service
const resend = import.meta.env.PRIVATE_RESEND_APIKEY
  ? new Resend(import.meta.env.PRIVATE_RESEND_APIKEY)
  : null;

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    const body = await context.request.json();
    const { tenantId, email } = body;

    if (!tenantId || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant ID and email are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify tenant exists
    const tenantConfigPath = path.join(process.cwd(), "tenants", tenantId, "config", "tenant.json");
    try {
      await fs.access(tenantConfigPath);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Read tenant config
    const tenantConfigRaw = await fs.readFile(tenantConfigPath, "utf-8");
    const tenantConfig = JSON.parse(tenantConfigRaw);

    // Check if tenant is in reserved status
    if (tenantConfig.status !== "reserved") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Tenant is not in reserved status (current status: ${tenantConfig.status})`,
          status: tenantConfig.status,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify the email matches
    if (tenantConfig.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email does not match the registered email for this tenant",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate a new activation token with the proper utility
    const activationToken = await generateActivationToken(tenantId, email, 48);

    if (!activationToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate activation token",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate activation URL
    const baseUrl = new URL(context.request.url).origin;
    const activationUrl = `${baseUrl}/sandbox/activate?token=${encodeURIComponent(activationToken)}`;

    // Send activation email
    let emailSent = false;
    if (resend) {
      try {
        // Generate the email HTML using the activation template
        const html = generateEmailHtml("activation", {
          name: tenantConfig.name || "there",
          activationUrl,
          tenantId,
          expirationHours: 48,
        });

        const { error } = await resend.emails.send({
          from: "Adon - At Risk Media <a@atriskmedia.com>",
          to: [email],
          subject: "Activate Your TractStack Sandbox",
          html,
        });

        if (error) {
          console.error("Error sending activation email:", error);
        } else {
          emailSent = true;
        }
      } catch (emailError) {
        console.error("Failed to send activation email:", emailError);
      }
    } else {
      console.warn("Email service not configured. Skipping activation email.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: emailSent
          ? "Activation token updated and email sent successfully"
          : "Activation token updated successfully, but email could not be sent",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error resending activation email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred processing your request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
