import { getButton, getParagraph } from "./components";

export interface ActivationEmailProps {
  name: string;
  activationUrl: string;
  tenantId: string;
  expirationHours?: number;
}

export function getActivationEmailContent({
  name,
  activationUrl,
  tenantId,
  expirationHours = 48,
}: ActivationEmailProps): string {
  return `
    ${getParagraph(`Hello ${name},`)}
    ${getParagraph("Thank you for creating your TractStack tenant. Please click the button below to activate your tenant:")}
    ${getButton({
      text: "Activate Your Tenant",
      url: activationUrl,
    })}
    ${getParagraph(`Once activated, you'll be able to access your tenant at:`)}
    ${getParagraph(`<strong>https://${tenantId}.sandbox.freewebpress.com</strong>`)}
    ${getParagraph(`This activation link will expire in ${expirationHours} hours.`)}
  `;
}
