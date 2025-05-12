import { useState, useEffect, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import SingleParam from "../fields/SingleParam";
import BooleanParam from "../fields/BooleanParam";
import { widgetMeta } from "@/constants";
import contactPersonaData from "../../../../../config/contactPersona.json";
import type { FlatNode } from "@/types";

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
  const [contactPersona, setContactPersona] = useState(
    String(node.codeHookParams?.[0] || contactPersonaData.contactPersona[0].id)
  );
  const [promptText, setPromptText] = useState(String(node.codeHookParams?.[1] || ""));
  const [clarifyConsent, setClarifyConsent] = useState(node.codeHookParams?.[2] === "true");
  const [query, setQuery] = useState("");

  const widgetInfo = widgetMeta.signup;
  const contactPersonas: ContactPersona[] = contactPersonaData.contactPersona;

  // Create collection for Combobox - filter out disabled personas
  const collection = useMemo(() => {
    const enabledPersonas = contactPersonas.filter((persona) => !persona.disabled);

    const filteredPersonas =
      query === ""
        ? enabledPersonas
        : enabledPersonas.filter((persona) =>
            persona.title.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredPersonas,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, [contactPersonas, query]);

  // Sync local state with node prop changes
  useEffect(() => {
    setContactPersona(String(node.codeHookParams?.[0] || contactPersonaData.contactPersona[0].id));
    setPromptText(String(node.codeHookParams?.[1] || ""));
    setClarifyConsent(node.codeHookParams?.[2] === "true");
  }, [node]);

  const handleContactPersonaChange = (details: { value: string[] }) => {
    const value = details.value[0] || contactPersonas[0].id;
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

  // Get the selected persona's display name
  const selectedPersonaTitle = useMemo(() => {
    const selected = contactPersonas.find((p) => p.id === contactPersona);
    return selected ? selected.title : "Select a contact persona";
  }, [contactPersona, contactPersonas]);

  // CSS for styling combobox items
  const comboboxItemStyles = `
    .persona-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .persona-item[data-highlighted] .persona-indicator {
      color: white;
    }
    .persona-item[data-state="checked"] .persona-indicator {
      display: flex;
    }
    .persona-item .persona-indicator {
      display: none;
    }
    .persona-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-4">
      <style>{comboboxItemStyles}</style>
      <div>
        <label className="block text-sm font-bold text-gray-700">
          {widgetInfo.parameters[0].label}
        </label>
        <Combobox.Root
          collection={collection}
          defaultValue={[contactPersona]}
          onValueChange={handleContactPersonaChange}
          onInputValueChange={(details) => setQuery(details.inputValue)}
        >
          <div className="relative mt-1">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue text-sm"
              placeholder="Select contact persona..."
              defaultValue={selectedPersonaTitle}
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Trigger>
          </div>
          <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {collection.items.length === 0 ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                Nothing found.
              </div>
            ) : (
              collection.items.map((persona) => (
                <Combobox.Item
                  key={persona.id}
                  item={persona}
                  className="persona-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                >
                  <span className="block truncate">{persona.title}</span>
                  <span className="block text-sm text-gray-500">{persona.description}</span>
                  <span className="persona-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-myblue">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </Combobox.Item>
              ))
            )}
          </Combobox.Content>
        </Combobox.Root>
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
