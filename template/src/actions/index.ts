import { ActionError, defineAction } from "astro:actions";
import { Resend } from "resend";
import { getSandboxEmailHtml } from "@/lib/email-templates/sandbox";

const resend = new Resend(import.meta.env.PRIVATE_RESEND_APIKEY);

/*
 * will need to add api end-point with actions wrapper
 * e.g. reserve sandbox + create sandbox.json
  <form action={actions.send} method="POST" data-astro-reload>
    <label for="name">Name:</label>
    <input type="text" id="name" name="name" />
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" />
    <button type="submit">Send email</button>
  </form>
 */

export const server = {
  send: defineAction({
    accept: "form",
    handler: async (formData) => {
      try {
        const emailValue = formData.get("email");
        const nameValue = formData.get("name");

        // Type check for email (required)
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

        const html = getSandboxEmailHtml({ name });

        const { data, error } = await resend.emails.send({
          from: "Adon - At Risk Media <a@atriskmedia.com>",
          to: [emailValue],
          subject: "Hello World",
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
