import { classNames } from "@/utils/common/helpers";
import { colors } from "@/constants";
import type { WizardData } from "@/types";

interface StoryKeepWizardProps {
  wizardData: WizardData;
}

type WizardStep = {
  message: string;
  buttonText: string;
  href: string;
};

const wizardSteps: Record<string, WizardStep> = {
  hasTitle: {
    message: "Make your first page!",
    buttonText: "Edit Home Page",
    href: "/hello/edit",
  },
  hasPanes: {
    message: "Your page needs some content. Add panes to build it out!",
    buttonText: "Edit Home Page",
    href: "/hello/edit",
  },
  hasAnyMenu: {
    message: "A menu helps visitors navigate. Let's create one now.",
    buttonText: "Create a Menu",
    href: "/storykeep/content/menus/create",
  },
  hasMenu: {
    message: "A menu helps visitors navigate. Link it to your Home Page.",
    buttonText: "Add Menu to Home Page",
    href: "/hello/edit?menu",
  },
  hasSeo: {
    message: "Each page can be customized for SEO rankings",
    buttonText: "Describe Home Page",
    href: "/hello/edit?seo",
  },
};

export const StoryKeepWizard = ({ wizardData }: StoryKeepWizardProps) => {
  if (
    wizardData.hasTitle &&
    wizardData.hasPanes &&
    wizardData.hasAnyMenu &&
    wizardData.hasMenu &&
    wizardData.hasSeo
  ) {
    return null;
  }

  let currentStep: WizardStep | null = null;
  let stepKey = "";
  if (!wizardData.hasTitle) {
    currentStep = wizardSteps.hasTitle;
    stepKey = "hasTitle";
  } else if (!wizardData.hasPanes) {
    currentStep = wizardSteps.hasPanes;
    stepKey = "hasPanes";
  } else if (!wizardData.hasAnyMenu) {
    currentStep = wizardSteps.hasAnyMenu;
    stepKey = "hasAnyMenu";
  } else if (!wizardData.hasMenu) {
    currentStep = wizardSteps.hasMenu;
    stepKey = "hasMenu";
  } else if (!wizardData.hasSeo) {
    currentStep = wizardSteps.hasSeo;
    stepKey = "hasSeo";
  }

  if (!currentStep) {
    return null;
  }

  const stepOrder = ["hasPage", "hasTitle", "hasPanes", "hasAnyMenu", "hasMenu", "hasSeo"];
  const colorIndex = stepOrder.indexOf(stepKey);

  return (
    <div className="w-full py-6">
      <h2 className="text-2xl font-bold mb-6">Setup your first Tract Stack</h2>
      <div className="flex flex-col gap-3">
        <p className="text-lg text-black">{currentStep.message}</p>
        <a
          href={currentStep.href}
          className={classNames(
            "rounded-md px-4 py-3 text-lg text-black shadow-sm ring-1 ring-inset w-fit",
            "bg-gray-100 hover:bg-mywhite ring-cyan-600"
          )}
        >
          <div className="flex items-center">
            <span
              aria-label="Color indicator"
              className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: colors[colorIndex % colors.length] }}
            />
            <span className="ml-3 block whitespace-normal text-left w-fit">
              {currentStep.buttonText}
            </span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default StoryKeepWizard;
