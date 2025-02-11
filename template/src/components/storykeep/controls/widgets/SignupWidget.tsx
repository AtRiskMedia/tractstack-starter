import SingleParam from "../fields/SingleParam";
import type { FlatNode } from "@/types";

interface SignupWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

function SignupWidget({ node, onUpdate }: SignupWidgetProps) {
  const params = node.codeHookParams || [];
  const contactPersona = String(params[0] || "");
  const promptText = String(params[1] || "");
  const clarifyConsent = String(params[2] || "");

  return (
    <div className="space-y-4">
      <SingleParam
        label="Contact Persona"
        value={contactPersona}
        onChange={(value) => onUpdate([value, promptText, clarifyConsent])}
      />
      <SingleParam
        label="Prompt Text"
        value={promptText}
        onChange={(value) => onUpdate([contactPersona, value, clarifyConsent])}
      />
      <SingleParam
        label="Clarify Consent"
        value={clarifyConsent}
        onChange={(value) => onUpdate([contactPersona, promptText, value])}
      />
    </div>
  );
}

export default SignupWidget;
