import { getButton, getParagraph } from "./components";

export interface SandboxEmailProps {
  name?: string;
  actionUrl?: string;
  actionText?: string;
}

export function getSandboxEmailContent({
  name = "there",
  actionUrl = "https://tractstack.com",
  actionText = "Visit Your Sandbox",
}: SandboxEmailProps = {}): string {
  return `
    ${getParagraph(`Hi ${name},`)}
    ${getParagraph("Welcome to your new TractStack sandbox! This environment lets you experiment with all the features of TractStack before going live.")}
    ${getButton({
      text: actionText,
      url: actionUrl,
    })}
    ${getParagraph("Your sandbox is ready to use. You can create content, test your site, and prepare for launch.")}
    ${getParagraph("If you have any questions, please reach out to our support team.")}
  `;
}
