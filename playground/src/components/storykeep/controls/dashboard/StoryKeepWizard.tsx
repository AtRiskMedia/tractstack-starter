import { classNames } from "@/utils/common/helpers";
import { colors } from "@/constants";
import type { WizardData } from "@/types";

interface StoryKeepWizardProps {
  wizardData: WizardData;
}

type WizardStep = {
  key: keyof WizardData;
  message: string;
  buttonText: string;
  href: string;
};

const wizardSteps: WizardStep[] = [
  {
    key: "hasTitle",
    message: "Make your first page!",
    buttonText: "Edit Home Page",
    href: "/hello/edit",
  },
  {
    key: "hasPanes",
    message: "Your page needs some content. Add panes to build it out!",
    buttonText: "Edit Home Page",
    href: "/hello/edit",
  },
  {
    key: "hasAnyMenu",
    message: "A menu helps visitors navigate. Let's create one now.",
    buttonText: "Create a Menu",
    href: "/storykeep/content/menus/create",
  },
  {
    key: "hasMenu",
    message: "A menu helps visitors navigate. Link it to your Home Page.",
    buttonText: "Add Menu to Home Page",
    href: "/hello/edit?menu",
  },
  {
    key: "hasSeo",
    message: "Each page can be customized for SEO rankings",
    buttonText: "Describe Home Page",
    href: "/hello/edit?seo",
  },
  {
    key: "hasSlogan",
    message: "Add a catchy slogan.",
    buttonText: "Add Site Slogan",
    href: "/storykeep/settings?slogan",
  },
  {
    key: "hasFooter",
    message: "Create a footer message to appear on every page.",
    buttonText: "Add Footer Text",
    href: "/storykeep/settings?footer",
  },
  {
    key: "hasLogo",
    message: "Upload your logo to brand your website.",
    buttonText: "Upload Logo",
    href: "/storykeep/settings?logo",
  },
  {
    key: "hasWordmark",
    message: "Add a wordmark for branding.",
    buttonText: "Upload Wordmark",
    href: "/storykeep/settings?wordmark",
  },
  {
    key: "hasOgTitle",
    message: "Set a title for social media sharing previews.",
    buttonText: "Add OG Title",
    href: "/storykeep/settings?ogTitle",
  },
  {
    key: "hasOgAuthor",
    message: "Add an author name for social media attribution.",
    buttonText: "Add OG Author",
    href: "/storykeep/settings?ogAuthor",
  },
  {
    key: "hasOgDesc",
    message: "Write a description for social media previews.",
    buttonText: "Add OG Description",
    href: "/storykeep/settings?ogDesc",
  },
  {
    key: "hasOg",
    message: "Upload an image for social media sharing previews.",
    buttonText: "Upload OG Image",
    href: "/storykeep/settings?og",
  },
  {
    key: "hasOgLogo",
    message: "Add a logo for social media previews.",
    buttonText: "Upload OG Logo",
    href: "/storykeep/settings?ogLogo",
  },
  {
    key: "hasFavicon",
    message: "Upload a favicon to appear in browser tabs.",
    buttonText: "Upload Favicon",
    href: "/storykeep/settings?favicon",
  },
  {
    key: "hasSocials",
    message: "Connect your social media accounts.",
    buttonText: "Add Social Links",
    href: "/storykeep/settings?socials",
  },
];

export const StoryKeepWizard = ({ wizardData }: StoryKeepWizardProps) => {
  const currentStepIndex = wizardSteps.findIndex((step) => {
    const value = wizardData[step.key];
    return typeof value === "boolean" && !value;
  });
  if (currentStepIndex === -1) {
    return null;
  }
  const currentStep = wizardSteps[currentStepIndex];

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
              style={{ backgroundColor: colors[currentStepIndex % colors.length] }}
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
