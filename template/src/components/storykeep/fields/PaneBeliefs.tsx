import { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import { paneHeldBeliefs, paneWithheldBeliefs } from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep";
import ContentEditableField from "../components/ContentEditableField";
import type { BeliefDatum } from "../../../types";

interface PaneBeliefsProps {
  id: string;
}

const PaneBeliefs = ({ id }: PaneBeliefsProps) => {
  const $paneHeldBeliefs = useStore(paneHeldBeliefs, { keys: [id] });
  const $paneWithheldBeliefs = useStore(paneWithheldBeliefs, { keys: [id] });
  const { updateStoreField, handleUndo } = useStoryKeepUtils(id);

  const [heldBeliefs, setHeldBeliefs] = useState<BeliefDatum>({});
  const [withheldBeliefs, setWithheldBeliefs] = useState<BeliefDatum>({});

  useEffect(() => {
    setHeldBeliefs($paneHeldBeliefs[id]?.current || {});
    setWithheldBeliefs($paneWithheldBeliefs[id]?.current || {});
  }, [$paneHeldBeliefs[id]?.current, $paneWithheldBeliefs[id]?.current]);

  const updateBeliefs = useCallback(
    (isHeld: boolean, newBeliefs: BeliefDatum) => {
      const storeKey = isHeld ? "paneHeldBeliefs" : "paneWithheldBeliefs";
      updateStoreField(storeKey, newBeliefs);
    },
    [updateStoreField]
  );

  const addBelief = (isHeld: boolean) => {
    const newKey = `newBelief${Object.keys(isHeld ? heldBeliefs : withheldBeliefs).length + 1}`;
    const updatedBeliefs = {
      ...(isHeld ? heldBeliefs : withheldBeliefs),
      [newKey]: [""],
    };
    if (isHeld) {
      setHeldBeliefs(updatedBeliefs);
    } else {
      setWithheldBeliefs(updatedBeliefs);
    }
    updateBeliefs(isHeld, updatedBeliefs);
  };

  const handleEditingChange = (
    isHeld: boolean,
    key: string,
    valueIndex: number | null,
    editing: boolean
  ) => {
    if (!editing) {
      const beliefs = isHeld ? heldBeliefs : withheldBeliefs;
      const updatedBeliefs = { ...beliefs };

      if (valueIndex !== null) {
        if (Array.isArray(updatedBeliefs[key])) {
          updatedBeliefs[key] = [...(updatedBeliefs[key] as string[])];
          (updatedBeliefs[key] as string[])[valueIndex] = (
            (updatedBeliefs[key] as string[])[valueIndex] || ""
          ).trim();
        }
      } else {
        const oldKey = Object.keys(beliefs).find((k) => k.toLowerCase() === key.toLowerCase());
        if (oldKey && oldKey !== key) {
          const values = updatedBeliefs[oldKey];
          delete updatedBeliefs[oldKey];
          updatedBeliefs[key] = values;
        }
      }

      if (isHeld) {
        setHeldBeliefs(updatedBeliefs);
      } else {
        setWithheldBeliefs(updatedBeliefs);
      }
      updateBeliefs(isHeld, updatedBeliefs);
    }
  };

  const addBeliefValue = (isHeld: boolean, key: string) => {
    const beliefs = isHeld ? heldBeliefs : withheldBeliefs;
    const values = beliefs[key];
    if (Array.isArray(values)) {
      const updatedValues = [...values, ""];
      const updatedBeliefs = { ...beliefs, [key]: updatedValues };
      if (isHeld) {
        setHeldBeliefs(updatedBeliefs);
      } else {
        setWithheldBeliefs(updatedBeliefs);
      }
      updateBeliefs(isHeld, updatedBeliefs);
    }
  };

  const removeBeliefValue = (isHeld: boolean, key: string, valueIndex: number) => {
    const beliefs = isHeld ? heldBeliefs : withheldBeliefs;
    const values = beliefs[key];
    if (Array.isArray(values)) {
      const updatedValues = values.filter((_, index) => index !== valueIndex);
      let updatedBeliefs: BeliefDatum;
      if (updatedValues.length === 0) {
        updatedBeliefs = Object.fromEntries(Object.entries(beliefs).filter(([k]) => k !== key));
      } else {
        updatedBeliefs = { ...beliefs, [key]: updatedValues };
      }
      if (isHeld) {
        setHeldBeliefs(updatedBeliefs);
      } else {
        setWithheldBeliefs(updatedBeliefs);
      }
      updateBeliefs(isHeld, updatedBeliefs);
    }
  };

  const renderBeliefForm = (isHeld: boolean) => {
    const beliefs = isHeld ? heldBeliefs : withheldBeliefs;
    const storeKey = isHeld ? "paneHeldBeliefs" : "paneWithheldBeliefs";
    return (
      <div className="mb-4 w-96">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">{isHeld ? "Held Beliefs" : "Withheld Beliefs"}</h3>
          <div className="flex items-center">
            <button
              onClick={() => addBelief(isHeld)}
              className="p-1 bg-myblue text-white rounded-md hover:bg-myblue/80 mr-2"
              title={`Add ${isHeld ? "Held" : "Withheld"} Belief`}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleUndo(storeKey, id)}
              className="disabled:hidden"
              disabled={$paneHeldBeliefs[id]?.history.length === 0}
            >
              <ChevronDoubleLeftIcon
                className="h-8 w-8 text-myblack rounded bg-mygreen/50 px-1 hover:bg-myorange hover:text-white"
                title="Undo"
              />
            </button>
          </div>
        </div>
        {Object.entries(beliefs).map(([key, values]) => (
          <div key={key} className="mb-2 p-2 border border-mylightgrey rounded-md">
            <div className="flex gap-2 mb-1">
              <div className="flex-1">
                <label className="text-sm text-mydarkgrey">Slug</label>
                <ContentEditableField
                  id={`belief-key-${isHeld ? "held" : "withheld"}-${key}`}
                  value={key}
                  onChange={() => {
                    return true;
                  }}
                  onEditingChange={(editing) => handleEditingChange(isHeld, key, null, editing)}
                  placeholder="Enter belief slug"
                  hyphenate={true}
                  className="block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-mydarkgrey">Value(s)</label>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(values) &&
                    values.map((value, valueIndex) => (
                      <div key={valueIndex} className="flex items-center">
                        <ContentEditableField
                          id={`belief-value-${isHeld ? "held" : "withheld"}-${key}-${valueIndex}`}
                          value={value}
                          onChange={() => {
                            return true;
                          }}
                          onEditingChange={(editing) =>
                            handleEditingChange(isHeld, key, valueIndex, editing)
                          }
                          placeholder="Value"
                          hyphenate={true}
                          className="block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-mygreen xs:text-sm xs:leading-6"
                        />
                        <div className="flex">
                          <button
                            onClick={() => removeBeliefValue(isHeld, key, valueIndex)}
                            className="ml-1 text-myorange hover:text-black"
                            title="Remove value"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          {valueIndex === values.length - 1 && (
                            <button
                              onClick={() => addBeliefValue(isHeld, key)}
                              className="text-mydarkgrey hover:text-black"
                              title="Add value"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-wrap gap-16">
      {renderBeliefForm(true)}
      {renderBeliefForm(false)}
    </div>
  );
};

export default PaneBeliefs;
