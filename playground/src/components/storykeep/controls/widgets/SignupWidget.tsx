import { useState, useEffect } from "react";
import { Listbox } from "@headlessui/react";
import SingleParam from "../fields/SingleParam";
import BooleanParam from "../fields/BooleanParam";
import { widgetMeta } from "@/constants";
import contactPersonaData from "../../../../../config/contactPersona.json";
import type { FlatNode } from "@/types";
import { classNames } from "@/utils/common/helpers";

interface SignupWidgetProps {
  node: FlatNode;
  onUpdate: (params: string[]) => void;
}

interface ContactPersona {
  id: string;
  title: string;
  description: string;
  disabled?: boolean;
}

function SignupWidget({ node, onUpdate }: SignupWidgetProps) {
  // Initialize local state from node.codeHookParams
  const [contactPersona, setContactPersona] = useState(
    String(node.codeHookParams?.[0] || contactPersonaData.contactPersona[0].id)
  );
  const [promptText, setPromptText] = useState(String(node.codeHookParams?.[1] || ""));
  const [clarifyConsent, setClarifyConsent] = useState(node.codeHookParams?.[2] === "true");

  const widgetInfo = widgetMeta.signup;
  const contactPersonas: ContactPersona[] = contactPersonaData.contactPersona;

  // Sync local state with node prop changes
  useEffect(() => {
    setContactPersona(String(node.codeHookParams?.[0] || contactPersonas[0].id));
    setPromptText(String(node.codeHookParams?.[1] || ""));
    setClarifyConsent(node.codeHookParams?.[2] === "true");
  }, [node]);

  const handleContactPersonaChange = (value: string) => {
    setContactPersona(value);
    onUpdate([value, promptText, clarifyConsent ? "true" : "false"]);
  };

  const handlePromptTextChange = (value: string) => {
    setPromptText(value);
    onUpdate([contactPersona, value, clarifyConsent ? "true" : "false"]);
  };

  const handleClarifyConsentChange = (value: boolean) => {
    setClarifyConsent(value);
    onUpdate([contactPersona, promptText, value ? "true" : "false"]);
  };

  return (
    <div className="space-y-4">
      <div>
        <Listbox value={contactPersona} onChange={handleContactPersonaChange}>
          <Listbox.Label className="block text-sm font-bold text-gray-700">
            {widgetInfo.parameters[0].label}
          </Listbox.Label>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm">
              <span className="block truncate">
                {contactPersonas.find((p) => p.id === contactPersona)?.title || "Select an option"}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {contactPersonas.map((persona) => (
                <Listbox.Option
                  key={persona.id}
                  className={({ active }) =>
                    classNames(
                      active ? "text-cyan-600 bg-gray-100" : "text-gray-900",
                      "relative cursor-default select-none py-2 pl-3 pr-9"
                    )
                  }
                  value={persona.id}
                  disabled={persona.disabled}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={classNames(
                          selected ? "font-bold" : "font-normal",
                          "block truncate"
                        )}
                      >
                        {persona.title}
                      </span>
                      <span className="text-sm text-gray-500 block">{persona.description}</span>
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>
      <SingleParam
        label={widgetInfo.parameters[1].label}
        value={promptText}
        onChange={handlePromptTextChange}
      />
      <BooleanParam
        label={widgetInfo.parameters[2].label}
        value={clarifyConsent}
        onChange={handleClarifyConsentChange}
      />
    </div>
  );
}

export default SignupWidget;
