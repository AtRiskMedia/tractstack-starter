import { ActionError, defineAction } from "astro:actions";
import { Resend } from "resend";
import { generateEmailHtml } from "@/utils/email-templates/html";

const resend = new Resend(import.meta.env.PRIVATE_RESEND_APIKEY);

/*
 * will need to add api end-point with actions wrapper
 * e.g. reserve sandbox + create sandbox.json
    //import { actions } from "astro:actions";
    <form action={actions.send} method="POST" data-astro-reload>
      <div style="margin-bottom: 10px;">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" />
      </div>

      <div style="margin-bottom: 10px;">
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" required />
      </div>

      <!-- Hidden fields with default values for sandbox -->
      <input type="hidden" name="template" value="sandbox" />
      <input type="hidden" name="subject" value="Welcome to Your TractStack Sandbox" />

      <button type="submit">Send Sandbox Email</button>
    </form>
 */

export const server = {
  send: defineAction({
    accept: "form",
    handler: async (formData) => {
      try {
        const emailValue = formData.get("email");
        const nameValue = formData.get("name");
        const templateValue = formData.get("template") || "sandbox";
        const subjectValue = formData.get("subject") || "Your TractStack";
        const payloadValue = formData.get("payload");

        let payload = {};

        if (payloadValue) {
          try {
            // Assuming payload is sent as JSON string
            payload = JSON.parse(
              typeof payloadValue === "string" ? payloadValue : String(payloadValue)
            );
          } catch (e) {
            throw new ActionError({
              code: "BAD_REQUEST",
              message: "Invalid payload format",
            });
          }
        }

        if (!emailValue) {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No email provided",
          });
        }

        if (typeof emailValue !== "string") {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Email must be a string",
          });
        }

        const name = typeof nameValue === "string" ? nameValue : "Friend";

        // Generate the email HTML using our template system
        const html = generateEmailHtml(String(templateValue), {
          name,
          ...payload,
        });

        const { data, error } = await resend.emails.send({
          from: "Adon - At Risk Media <a@atriskmedia.com>",
          to: [emailValue],
          subject: String(subjectValue),
          html,
        });

        if (error) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        return { success: true, id: data?.id };
      } catch (error) {
        console.error("Action error:", error);

        let errorMessage = "Failed to send email";
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        }

        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }
    },
  }),
};
