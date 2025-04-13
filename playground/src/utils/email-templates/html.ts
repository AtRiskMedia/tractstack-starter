import { getEmailLayout } from "@/lib/email-templates/layout";
import { getSandboxEmailContent } from "@/lib/email-templates/sandbox";
import { getActivationEmailContent } from "@/lib/email-templates/activation";

type EmailTemplateParams = Record<string, any>;

export function generateEmailHtml(template: string, params: EmailTemplateParams = {}): string {
  let content = "";
  let preheader = "";

  switch (template) {
    case "sandbox":
      content = getSandboxEmailContent({
        name: params.name || "there",
        actionUrl: params.actionUrl,
        actionText: params.actionText,
      });
      preheader = "Your TractStack sandbox is ready to use!";
      break;

    case "activation":
      if (!params.activationUrl || !params.tenantId) {
        throw new Error("Missing required parameters for activation email");
      }

      content = getActivationEmailContent({
        name: params.name || "there",
        activationUrl: params.activationUrl,
        tenantId: params.tenantId,
        expirationHours: params.expirationHours,
      });
      preheader = "Activate your TractStack tenant";
      break;

    default:
      // Default to sandbox template if unrecognized template specified
      content = getSandboxEmailContent({
        name: params.name || "Friend",
      });
      preheader = "Welcome to TractStack";
  }

  // Generate the full HTML email
  return getEmailLayout({
    preheader: params.preheader || preheader,
    content,
    footerText: params.footerText,
    companyAddress: params.companyAddress,
    unsubscribeUrl: params.unsubscribeUrl,
    poweredByText: params.poweredByText,
    poweredByUrl: params.poweredByUrl,
  });
}
