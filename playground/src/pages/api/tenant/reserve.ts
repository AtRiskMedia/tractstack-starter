import type { APIRoute } from "astro";
import { withTenantContext } from "@/utils/api/middleware";
import { checkTenantAvailability } from "@/utils/tenant/checkTenantAvailability";
import { createTenant } from "@/utils/tenant/createTenant";
import { generateActivationToken } from "@/utils/tenant/getActivationToken";
import { getTenantByEmail } from "@/utils/tenant/getTenantByEmail";
import { getTenantStatus } from "@/utils/tenant/getTenantStatus";
import { Resend } from "resend";
import { generateEmailHtml } from "@/utils/email-templates/html";
import type { APIContext } from "@/types";

// Initialize email service
const resend = import.meta.env.PRIVATE_RESEND_APIKEY
  ? new Resend(import.meta.env.PRIVATE_RESEND_APIKEY)
  : null;

export const POST: APIRoute = withTenantContext(async (context: APIContext) => {
  try {
    // Parse request body
    const body = await context.request.json();
    const { tenantId, email, name } = body;

    // Validate required fields
    if (!tenantId || !email || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tenant ID, email, and name are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid email format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if email already has a tenant
    const existingTenant = await getTenantByEmail(email);
    if (existingTenant) {
      // Check if the existing tenant is not archived
      const tenantStatus = await getTenantStatus(existingTenant.tenantId);
      if (tenantStatus && tenantStatus.status !== "archived") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This email is already associated with a tenant",
            emailExists: true,
            tenantId: existingTenant.tenantId,
            status: tenantStatus.status,
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Check tenant ID availability
    const availabilityCheck = await checkTenantAvailability(tenantId);
    if (!availabilityCheck.available) {
      return new Response(
        JSON.stringify({
          success: false,
          error: availabilityCheck.reason || "Tenant ID is not available",
          available: false,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create the tenant
    const creationResult = await createTenant(tenantId, email, name);
    if (!creationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: creationResult.message || "Failed to create tenant",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate activation token
    const activationToken = await generateActivationToken(tenantId, email);
    if (!activationToken) {
      // If token generation fails, return error and don't proceed with email
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
    const activationUrl = `${baseUrl}/tenant/activate?token=${encodeURIComponent(activationToken)}`;

    // Send activation email
    let emailSent = false;
    if (resend) {
      try {
        // Generate the email HTML using the activation template
        const html = generateEmailHtml("activation", {
          name,
          activationUrl,
          tenantId,
          expirationHours: 48,
        });

        const { error } = await resend.emails.send({
          from: "Tract Stack <no-reply@tractstack.com>",
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
        tenantId,
        emailSent,
        message: emailSent
          ? "Tenant reserved successfully. Check your email for activation instructions."
          : "Tenant reserved successfully, but activation email could not be sent.",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error reserving tenant:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred reserving the tenant",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
