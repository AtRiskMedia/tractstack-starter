import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Steps } from "@ark-ui/react/steps";
import {
  initWizardStore,
  setCurrentStep,
  completeStep,
  uncompleteStep,
  updateValidation,
  quickSetup,
  toggleQuickSetup,
} from "@/store/init";
import { tenantIdStore } from "@/store/storykeep.ts";
import SetupStep from "./steps/SetupStep";
import IntegrationsStep from "./steps/IntegrationsStep";
import BrandStep from "./steps/BrandStep";
import SecurityStep from "./steps/SecurityStep";
import PublishStep from "./steps/PublishStep";
import CreateHomeStep from "./steps/CreateHomeStep";
import HasHomeStep from "./steps/HasHomeStep";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import LockClosedIcon from "@heroicons/react/24/outline/LockClosedIcon";
import type { InitStep, InitStepConfig, ValidationResult, Config } from "../../../types";

interface InitWizardProps {
  hasConcierge: boolean;
  validation: ValidationResult;
  init: boolean;
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
  "PRIVATE_ADMIN_PASSWORD",
  "PRIVATE_EDITOR_PASSWORD",
];

export default function InitWizard({
  hasConcierge,
  validation: initialValidation,
  init,
}: InitWizardProps) {
  const tenantId = tenantIdStore.get();
  const isMultiTenant =
    import.meta.env.PUBLIC_ENABLE_MULTI_TENANT === "true" && tenantId !== `default`;
  const initialConfig = initialValidation.config;
  const $store = useStore(initWizardStore);
  const isQuickSetup = useStore(quickSetup);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>(initialValidation);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasInit = init && initialConfig?.init?.SITE_INIT;
  const [hasInitCompleted, setHasInitCompleted] = useState(false);
  const hasHome = !!(
    typeof initialConfig?.init?.HOME_SLUG === `string` &&
    initialConfig.init.HOME_SLUG &&
    typeof initialConfig?.init?.TRACTSTACK_HOME_SLUG === `string` &&
    initialConfig.init.TRACTSTACK_HOME_SLUG
  );

  // Logo and branding configuration
  const logo =
    (typeof initialConfig?.init?.LOGO === "string" && initialConfig?.init?.LOGO) || "/logo.svg";
  const logoIsSvg = logo.includes("svg");
  const wordmark =
    (typeof initialConfig?.init?.WORDMARK === "string" && initialConfig?.init?.WORDMARK) ||
    "/wordmark.svg";
  const wordmarkIsSvg = wordmark.includes("svg");
  const wordmarkMode = initialConfig?.init?.WORDMARK_MODE || `default`;

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

  // Calculate steps array based on quick setup mode
  const stepsConfig = useMemo(() => {
    if (isQuickSetup) {
      // Quick setup mode: only setup and createHome steps
      return [
        {
          id: "setup" as InitStep,
          title: "Quick Start Setup",
          description: "Get started quickly",
          isComplete: hasInit || $store.completedSteps.includes("setup"),
          isLocked: false,
        },
        {
          id: "createHome" as InitStep,
          title: "Create Home Page",
          description: "Set up your site's landing page",
          isComplete: $store.completedSteps.includes("createHome"),
          isLocked: !$store.completedSteps.includes("setup"),
        },
      ];
    }

    // Full setup mode: all steps
    const requiresPublish = configState.needsPublish.size > 0;
    const steps: InitStepConfig[] = [];

    if (init) {
      steps.push({
        id: "setup",
        title: "Welcome to your Story Keep",
        description: "Make it your own Tract Stack instance",
        isComplete: hasInit || $store.completedSteps.includes("setup"),
        isLocked: false,
      });
    }

    steps.push({
      id: "brand",
      title: "Brand Customization",
      description: "Customize your site's look and feel",
      isComplete: hasInit || $store.completedSteps.includes("brand"),
      isLocked: init ? !$store.completedSteps.includes("setup") : false,
    });

    if (hasConcierge && !isMultiTenant) {
      steps.push({
        id: "integrations",
        title: "Set Up Integrations",
        description: "Connect external services and APIs",
        isComplete: hasInit || $store.completedSteps.includes("integrations"),
        isLocked: !$store.completedSteps.includes("brand"),
      });
    }

    if (hasConcierge || isMultiTenant) {
      steps.push({
        id: "security",
        title: "Secure Your Site",
        description: "Set up authentication and access control",
        isComplete: hasInit || $store.completedSteps.includes("security"),
        isLocked: !$store.completedSteps.includes(
          hasConcierge && !isMultiTenant ? "integrations" : "brand"
        ),
      });
    }

    if (requiresPublish) {
      steps.push({
        id: "publish",
        title: "Republish with New Config",
        description: "Apply your configuration changes",
        isComplete: hasInit || $store.completedSteps.includes("publish"),
        isLocked: !$store.completedSteps.includes(hasConcierge ? "security" : "brand"),
      });
    }

    steps.push({
      id: "createHome",
      title: "Create Home Page",
      description: "Set up your site's landing page",
      isComplete: $store.completedSteps.includes("createHome"),
      isLocked: !$store.completedSteps.includes(
        requiresPublish ? "publish" : hasConcierge ? "security" : "brand"
      ),
    });

    return steps;
  }, [
    isQuickSetup,
    $store.completedSteps,
    configState.needsPublish.size,
    hasInit,
    hasConcierge,
    isMultiTenant,
    init,
  ]);

  // Find initial step index
  const initialStepIndex = useMemo(() => {
    const firstIncompleteUnlocked = stepsConfig.findIndex((s) => !s.isComplete && !s.isLocked);
    return firstIncompleteUnlocked !== -1 ? firstIncompleteUnlocked : 0;
  }, [stepsConfig]);

  // Controlled step state
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);

  // Update current step index when store changes
  useEffect(() => {
    const currentStepId = $store.currentStep;
    const index = stepsConfig.findIndex((s) => s.id === currentStepId);
    if (index !== -1 && index !== currentStepIndex) {
      setCurrentStepIndex(index);
    }
  }, [$store.currentStep, stepsConfig]);

  useEffect(() => {
    if (initialValidation) {
      updateValidation(initialValidation);
      setValidation(initialValidation);
    }
  }, [initialValidation]);

  // Effect for quick setup mode - auto-complete intermediate steps when activated
  useEffect(() => {
    if (isQuickSetup && $store.currentStep === "setup") {
      // Auto-complete all intermediate steps that would be skipped
      completeStep("brand");
      if (hasConcierge && !isMultiTenant) completeStep("integrations");
      if (hasConcierge || isMultiTenant) completeStep("security");
      if (configState.needsPublish.size > 0) completeStep("publish");
    }
  }, [
    isQuickSetup,
    $store.currentStep,
    hasConcierge,
    isMultiTenant,
    configState.needsPublish.size,
  ]);

  // Handle step change from Ark UI
  const handleStepChange = useCallback(
    (details: { step: number }) => {
      const newStep = stepsConfig[details.step];
      if (newStep && !newStep.isLocked) {
        setCurrentStepIndex(details.step);
        setCurrentStep(newStep.id);
      }
    },
    [stepsConfig]
  );

  // Central handler for all configuration updates
  const handleConfigUpdate = useCallback(
    async (step: InitStep, updates: Record<string, unknown>) => {
      setConfigState((prev) => {
        const newStepChanges = {
          ...prev.stepChanges,
          [step]: { ...prev.stepChanges[step], ...updates },
        };
        const newNeedsPublish = new Set(prev.needsPublish);
        if (Object.keys(updates).some((key) => PUBLISH_TRIGGERS.includes(key)))
          newNeedsPublish.add(step);
        const newCurrent = prev.current
          ? ({ ...prev.current, init: { ...prev.current.init, ...updates } } as Config)
          : null;
        return { current: newCurrent, stepChanges: newStepChanges, needsPublish: newNeedsPublish };
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
  async function saveConfigChanges(changes: Record<string, unknown>) {
    try {
      const configResponse = await fetch("/api/fs/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Init-Operation": "true" },
        body: JSON.stringify({ file: "init", updates: changes }),
      });
      if (!configResponse.ok) throw new Error("Failed to save configuration");

      if ("BRAND_COLOURS" in changes) {
        const cssResponse = await fetch("/api/fs/updateCss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandColors: changes.BRAND_COLOURS }),
        });
        if (!cssResponse.ok) throw new Error("Failed to update CSS variables");
      }

      return await configResponse.json();
    } catch (error) {
      console.error("Error saving config:", error);
      throw error;
    }
  }

  // Central publish handler
  const handlePublish = async () => {
    if (!hasConcierge) return true;
    try {
      if (configState.needsPublish.size > 0) {
        const response = await fetch("/api/concierge/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "all" }),
        });
        if (!response.ok) throw new Error("Failed to trigger rebuild");
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
        if (step === "publish") {
          if (!hasInit) setHasInitCompleted(true);
          if (configState.needsPublish.size > 0) await handlePublish();
        }
        completeStep(step);

        // Move to next step if not at last
        const currentIndex = stepsConfig.findIndex((s) => s.id === step);
        if (currentIndex < stepsConfig.length - 1) {
          const nextIndex = currentIndex + 1;
          setCurrentStepIndex(nextIndex);
          const nextStep = stepsConfig[nextIndex];
          if (nextStep) {
            setCurrentStep(nextStep.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [configState, hasConcierge, hasInit, stepsConfig]
  );

  const handleBack = useCallback(() => {
    if (isQuickSetup) {
      // In quick setup mode, back means exit quick setup
      toggleQuickSetup(false);
      return;
    }

    // Check if not at first step
    if (currentStepIndex > 0) {
      const previousIndex = currentStepIndex - 1;
      const previousStep = stepsConfig[previousIndex];
      if (previousStep) {
        uncompleteStep(previousStep.id);
        setCurrentStepIndex(previousIndex);
        setCurrentStep(previousStep.id);
      }
    }
  }, [currentStepIndex, isQuickSetup, stepsConfig]);

  const renderStepContent = useCallback(
    (step: InitStepConfig, index: number) => {
      const isActive = currentStepIndex === index;
      const commonProps = {
        onComplete: () => handleStepComplete(step.id),
        onBack: handleBack,
        isActive,
        onConfigUpdate: (updates: Record<string, unknown>) => handleConfigUpdate(step.id, updates),
        validation,
        config: configState.current,
        isProcessing,
      };

      if (hasHome && hasInitCompleted) return <HasHomeStep {...commonProps} />;
      if (hasInit || hasInitCompleted) return <CreateHomeStep {...commonProps} />;

      switch (step.id) {
        case "setup":
          return <SetupStep {...commonProps} hasConcierge={hasConcierge} />;
        case "brand":
          return <BrandStep sandbox={isMultiTenant} {...commonProps} />;
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
          return hasHome ? <HasHomeStep {...commonProps} /> : <CreateHomeStep {...commonProps} />;
        default:
          return null;
      }
    },
    [
      currentStepIndex,
      configState,
      hasConcierge,
      validation,
      handleBack,
      handleStepComplete,
      isProcessing,
      hasHome,
      hasInit,
      hasInitCompleted,
      isMultiTenant,
      handleConfigUpdate,
    ]
  );

  return (
    <div className="py-4">
      <div className="rounded-lg px-3.5 py-6 shadow-inner bg-white mx-4">
        <div className="flex flex-col space-y-8">
          <div className="relative">
            <div className="flex flex-col items-center justify-center gap-4">
              {[`default`, `logo`].includes(wordmarkMode) && (
                <div className="h-16 w-auto">
                  {logoIsSvg ? (
                    <object
                      type="image/svg+xml"
                      data={logo}
                      className="h-full w-auto pointer-events-none"
                      aria-label="Logo"
                    >
                      Logo
                    </object>
                  ) : (
                    <img src={logo} className="h-full w-auto pointer-events-none" alt="Logo" />
                  )}
                </div>
              )}
              {[`default`, `wordmark`].includes(wordmarkMode) && (
                <div className="h-16 w-auto">
                  {wordmarkIsSvg ? (
                    <object
                      type="image/svg+xml"
                      data={wordmark}
                      className="h-full w-auto max-w-48 md:max-w-72 pointer-events-none"
                      aria-label="Wordmark"
                    >
                      Wordmark
                    </object>
                  ) : (
                    <img
                      src={wordmark}
                      className="h-full w-auto max-w-48 md:max-w-72 pointer-events-none"
                      alt="Wordmark"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>}

          <Steps.Root
            count={stepsConfig.length}
            step={currentStepIndex}
            onStepChange={handleStepChange}
            linear={false}
          >
            <Steps.List className="flex justify-between mb-8">
              {stepsConfig.map((step, index) => (
                <Steps.Item key={step.id} index={index} className="flex items-center flex-1">
                  <Steps.Trigger
                    disabled={step.isLocked}
                    className={`flex items-center ${step.isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    <Steps.Indicator
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.isComplete
                          ? "bg-mydarkgrey text-myoffwhite"
                          : currentStepIndex === index
                            ? "bg-cyan-600 text-white"
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
                    </Steps.Indicator>
                  </Steps.Trigger>
                  {index < stepsConfig.length - 1 && (
                    <Steps.Separator
                      className={`flex-1 h-0.5 mx-2 ${
                        step.isComplete ? "bg-mydarkgrey" : "bg-mylightgrey"
                      }`}
                    />
                  )}
                </Steps.Item>
              ))}
            </Steps.List>

            <div className="space-y-6">
              {stepsConfig.map((step, index) => (
                <Steps.Content key={step.id} index={index}>
                  {renderStepContent(step, index)}
                </Steps.Content>
              ))}
            </div>
          </Steps.Root>
        </div>
      </div>
    </div>
  );
}
