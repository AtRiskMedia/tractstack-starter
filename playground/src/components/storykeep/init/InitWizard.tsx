import { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  initWizardStore,
  setCurrentStep,
  completeStep,
  uncompleteStep,
  updateValidation,
} from "../../../store/init";
import SetupStep from "./steps/SetupStep";
import IntegrationsStep from "./steps/IntegrationsStep";
import BrandStep from "./steps/BrandStep";
import SecurityStep from "./steps/SecurityStep";
import PublishStep from "./steps/PublishStep";
import CreateHomeStep from "./steps/CreateHomeStep";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import LockClosedIcon from "@heroicons/react/24/outline/LockClosedIcon";
import type { InitStep, InitStepConfig, ValidationResult, Config } from "../../../types";

interface InitWizardProps {
  hasConcierge: boolean;
  validation: ValidationResult;
  config: Config | null;
}

interface ConfigState {
  current: Config | null;
  stepChanges: Record<InitStep, Record<string, unknown>>;
  needsPublish: Set<InitStep>;
}

const PUBLISH_TRIGGERS = [
  "PRIVATE_TURSO_DATABASE_URL",
  "PRIVATE_TURSO_AUTH_TOKEN",
  "PRIVATE_ASSEMBLYAI_API_KEY",
  "BRAND_COLOURS",
  "PRIVATE_ADMIN_PASSWORD",
  "PRIVATE_EDITOR_PASSWORD",
];

export default function InitWizard({
  hasConcierge,
  validation: initialValidation,
  config: initialConfig,
}: InitWizardProps) {
  const $store = useStore(initWizardStore);
  const [steps, setSteps] = useState<InitStepConfig[]>([]);
  const [validation, setValidation] = useState<ValidationResult>(initialValidation);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [configState, setConfigState] = useState<ConfigState>({
    current: initialConfig,
    stepChanges: {
      setup: {},
      brand: {},
      integrations: {},
      security: {},
      publish: {},
      createHome: {},
    },
    needsPublish: new Set(),
  });

  useEffect(() => {
    if (initialValidation) {
      updateValidation(initialValidation);
      setValidation(initialValidation);
    }
  }, [initialValidation]);

  // Central handler for all configuration updates
  const handleConfigUpdate = useCallback(
    async (step: InitStep, updates: Record<string, unknown>) => {
      setConfigState((prev) => {
        const newStepChanges = {
          ...prev.stepChanges,
          [step]: {
            ...prev.stepChanges[step],
            ...updates,
          },
        };

        const newNeedsPublish = new Set(prev.needsPublish);
        // Only mark for publish if any of the changes are to publish-triggering settings
        if (Object.keys(updates).some((key) => PUBLISH_TRIGGERS.includes(key))) {
          newNeedsPublish.add(step);
        }

        // Create properly typed new config
        const newCurrent = prev.current
          ? ({
              ...prev.current,
              init: {
                ...prev.current.init,
                ...updates,
              },
            } as Config)
          : null;

        return {
          current: newCurrent,
          stepChanges: newStepChanges,
          needsPublish: newNeedsPublish,
        };
      });

      try {
        setIsProcessing(true);
        await saveConfigChanges(updates);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save changes");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Central save handler
  const saveConfigChanges = async (changes: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/fs/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Init-Operation": "true",
        },
        body: JSON.stringify({
          file: "init",
          updates: changes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  };

  // Central publish handler
  const handlePublish = async () => {
    if (!hasConcierge) return true;

    try {
      // Only publish if we have changes that require it
      if (configState.needsPublish.size > 0) {
        const response = await fetch("/api/concierge/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "all" }),
        });

        if (!response.ok) {
          throw new Error("Failed to trigger rebuild");
        }
      }
      return true;
    } catch (error) {
      console.error("Error publishing:", error);
      throw error;
    }
  };

  // Step completion handler
  const handleStepComplete = useCallback(
    async (step: InitStep) => {
      try {
        setIsProcessing(true);
        setError(null);
        // Only actually publish in PublishStep
        if (step === "publish" && !hasConcierge) window.location.reload();
        else if (step === "publish" && configState.needsPublish.size > 0) {
          await handlePublish();
        }
        completeStep(step);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [configState, hasConcierge]
  );

  const handleBack = useCallback(() => {
    const currentIndex = steps.findIndex((s) => s.id === $store.currentStep);
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1].id;
      uncompleteStep(previousStep);
      setCurrentStep(previousStep);
    }
  }, [steps, $store.currentStep]);

  // Step configuration and management
  useEffect(() => {
    const isInitialized =
      (configState.current?.init as Record<string, unknown>)?.SITE_INIT === true;
    const hasHomeSlug = Boolean((configState.current?.init as Record<string, unknown>)?.HOME_SLUG);
    const requiresPublish = configState.needsPublish.size > 0;

    const newSteps: InitStepConfig[] = [
      {
        id: "setup",
        title: "Setup Story Keep",
        description: "Initialize your Story Keep instance",
        isComplete: initialConfig?.init?.SITE_INIT || $store.completedSteps.includes("setup"),
        isLocked: false,
      },
      {
        id: "brand",
        title: "Brand Customization",
        description: "Customize your site's look and feel",
        isComplete: initialConfig?.init?.SITE_INIT || $store.completedSteps.includes("brand"),
        isLocked: !$store.completedSteps.includes("setup"),
      },
    ];

    if (hasConcierge)
      newSteps.push(
        {
          id: "integrations",
          title: "Set Up Integrations",
          description: "Connect external services and APIs",
          isComplete:
            initialConfig?.init?.SITE_INIT || $store.completedSteps.includes("integrations"),
          isLocked: !$store.completedSteps.includes("brand"),
        },
        {
          id: "security",
          title: "Secure Your Site",
          description: "Set up authentication and access control",
          isComplete: initialConfig?.init?.SITE_INIT || $store.completedSteps.includes("security"),
          isLocked: !$store.completedSteps.includes("integrations"),
        }
      );

    newSteps.push(
      {
        id: "publish",
        title: "Republish with New Config",
        description: "Apply your configuration changes",
        isComplete: initialConfig?.init?.SITE_INIT || $store.completedSteps.includes("publish"),
        isLocked: !$store.completedSteps.includes(hasConcierge ? "security" : "brand"),
      },
      {
        id: "createHome",
        title: "Create Home Page",
        description: "Set up your site's landing page",
        isComplete: $store.completedSteps.includes("createHome"),
        isLocked:
          !$store.completedSteps.includes(requiresPublish ? "publish" : "security") ||
          !isInitialized ||
          hasHomeSlug,
      }
    );

    setSteps(newSteps);

    const nextStep = newSteps.find((s) => !s.isComplete && !s.isLocked);
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  }, [$store.completedSteps, configState]);

  // Step renderer with unified props
  const renderStep = useCallback(
    (step: InitStepConfig) => {
      const isActive = $store.currentStep === step.id;
      const commonProps = {
        onComplete: () => handleStepComplete(step.id),
        onBack: handleBack,
        isActive,
        onConfigUpdate: (updates: Record<string, unknown>) => handleConfigUpdate(step.id, updates),
        validation,
        config: configState.current,
        isProcessing,
      };

      if (initialConfig?.init?.SITE_INIT) return <CreateHomeStep {...commonProps} />;

      switch (step.id) {
        case "setup":
          return <SetupStep {...commonProps} hasConcierge={hasConcierge} />;
        case "brand":
          return <BrandStep {...commonProps} />;
        case "integrations":
          return <IntegrationsStep {...commonProps} />;
        case "security":
          return <SecurityStep {...commonProps} />;
        case "publish":
          return (
            <PublishStep
              {...commonProps}
              hasConcierge={hasConcierge}
              needsPublish={configState.needsPublish.size > 0}
            />
          );
        case "createHome":
          return <CreateHomeStep {...commonProps} />;
        default:
          return null;
      }
    },
    [
      $store.currentStep,
      configState,
      hasConcierge,
      validation,
      handleBack,
      handleStepComplete,
      isProcessing,
    ]
  );

  return (
    <div className="outline-2 outline-dashed outline-myblue/10 outline-offset-[-2px] bg-myblue/20 py-4">
      <div className="rounded-lg px-3.5 py-6 shadow-inner bg-white mx-4">
        <div className="flex flex-col space-y-8">
          <div className="relative">
            <h2 className="inline-block font-action text-myblue text-2xl md:text-3xl">
              Hello world!
            </h2>
          </div>

          {error && <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>}

          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? "w-full" : ""}`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    step.isComplete
                      ? "bg-mygreen text-black"
                      : $store.currentStep === step.id
                        ? "bg-myorange text-black"
                        : step.isLocked
                          ? "bg-mylightgrey text-mydarkgrey"
                          : "bg-myblue text-white"
                  }`}
                >
                  {step.isComplete ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : step.isLocked ? (
                    <LockClosedIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-full h-0.5 mx-2 ${
                      step.isComplete ? "bg-mygreen" : "bg-mylightgrey"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`transition-all duration-200 ${
                  $store.currentStep === step.id ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                }`}
              >
                {renderStep(step)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
