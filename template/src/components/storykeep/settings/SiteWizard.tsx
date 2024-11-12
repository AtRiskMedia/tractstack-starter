import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { previewMode, previewDbInitialized, getPreviewModeValue } from "../../../store/storykeep";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import InformationCircleIcon from "@heroicons/react/24/outline/InformationCircleIcon";
import ChevronUpIcon from "@heroicons/react/24/outline/ChevronUpIcon";
import LockClosedIcon from "@heroicons/react/24/outline/LockClosedIcon";
import TursoConnectionForm from "../fields/TursoConnectionForm";
import IntegrationsConnectionForm from "../fields/IntegrationsConnectionForm";
import DatabaseBootstrap from "../components/DatabaseBootstrap";
import DatabaseContentBootstrap from "../components/DatabaseContentBootstrap";
import EnvironmentSettings from "../fields/EnvironmentSettings";
import type { ReactNode } from "react";
import type { FullContentMap } from "../../../types";

const NeedsConcierge = ({ onClick }: { onClick: () => void }) => (
  <div className="space-y-8 text-xl md:text-2xl text-mydarkgrey">
    <p>
      For a production install, please see{` `}
      <a
        className="text-myblue font-bold underline hover:text-myorange"
        href="https://tractstack.org"
      >
        our docs
      </a>
      {` `}
      for install recipes
    </p>
    <p>
      Continue without install:{" "}
      <button
        className="px-4 py-2 text-white bg-black rounded hover:bg-myblue disabled:bg-mydarkgrey disabled:cursor-not-allowed"
        onClick={onClick}
      >
        Try Tract Stack
      </button>
    </p>
  </div>
);

const Login = () => (
  <div className="text-xl md:text-2xl text-mydarkgrey">
    <a className="font-bold underline hover:text-myorange" href="/storykeep/login?force=true">
      Login-in
    </a>{" "}
    to continue.
  </div>
);

const Completed = () => (
  <div className="font-bold font-action text-xl md:text-2xl mt-2 text-mydarkgrey">Completed</div>
);

const NeedsContent = ({ hasAssemblyAI }: { hasAssemblyAI: boolean }) => (
  <div className="space-x-6 text-xl md:text-2xl text-mydarkgrey">
    {hasAssemblyAI && (
      <a
        className="px-4 py-2 text-white bg-black rounded hover:bg-myblue disabled:bg-mydarkgrey disabled:cursor-not-allowed"
        href="/storykeep/create/ai/storyfragment"
      >
        Create New Web Page with AI!
      </a>
    )}
    <a
      className="px-4 py-2 text-white bg-black rounded hover:bg-myblue disabled:bg-mydarkgrey disabled:cursor-not-allowed"
      href="/storykeep/create/storyfragment"
    >
      Create New Web Page
    </a>
  </div>
);

interface SiteWizardProps {
  hasConcierge: boolean;
  hasTurso: boolean;
  hasTursoReady: boolean;
  hasBranding: boolean;
  hasContent: boolean;
  hasContentReady: boolean;
  hasContentPrimed: boolean;
  hasAssemblyAI: boolean;
  hasAuth: boolean;
  contentMap: FullContentMap[];
}

type StepStatus = "completed" | "current" | "locked";

interface SetupStep {
  title: string;
  description: ReactNode;
  isComplete: boolean;
  status: StepStatus;
}

export default function SiteWizard({
  hasConcierge,
  hasTurso,
  hasTursoReady,
  hasBranding,
  hasContent,
  hasContentReady,
  hasContentPrimed,
  hasAuth,
  hasAssemblyAI,
  contentMap,
}: SiteWizardProps) {
  const [gotTurso, setGotTurso] = useState(false);
  const [gotIntegrations, setGotIntegrations] = useState(false);
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});
  const $previewMode = getPreviewModeValue(useStore(previewMode));
  const $previewDbInitialized = getPreviewModeValue(useStore(previewDbInitialized));
  const getStepStatus = (index: number): StepStatus => {
    const completionStates = [
      hasConcierge || $previewMode,
      hasAuth || $previewMode,
      hasTurso || gotTurso || ($previewMode && $previewDbInitialized),
      gotIntegrations || hasBranding || ($previewMode && $previewDbInitialized),
      hasBranding || ($previewMode && $previewDbInitialized),
      hasTursoReady && hasContentPrimed,
      hasContentReady,
    ];
    const isCompleted = completionStates[index];
    const allPreviousCompleted = completionStates.slice(0, index).every((state) => state);
    if (!allPreviousCompleted || ($previewMode && index > 2 && index < 5)) return "locked";
    if (isCompleted) return "completed";
    return "current";
  };

  const handleInitOpenDemo = () => {
    previewMode.set("true");
  };

  const setupSteps: SetupStep[] = [
    {
      title: "Install the Story Keep",
      description: !hasConcierge ? <NeedsConcierge onClick={handleInitOpenDemo} /> : <Completed />,
      isComplete: hasConcierge || $previewMode,
      status: getStepStatus(0),
    },
    {
      title: "Login",
      description: !hasAuth ? <Login /> : <Completed />,
      isComplete: hasAuth || $previewMode,
      status: getStepStatus(1),
    },
    {
      title: "Connect your Turso database",
      description: $previewMode ? (
        <DatabaseBootstrap />
      ) : !hasTurso ? (
        <TursoConnectionForm setGotTurso={setGotTurso} />
      ) : (
        <Completed />
      ),
      isComplete: hasTurso || gotTurso || ($previewMode && $previewDbInitialized),
      status: getStepStatus(2),
    },
    {
      title: "Add your Integrations",
      description:
        !gotIntegrations && !hasBranding ? (
          <IntegrationsConnectionForm setGotIntegrations={setGotIntegrations} />
        ) : (
          <Completed />
        ),
      isComplete: gotIntegrations || hasBranding || ($previewMode && $previewDbInitialized),
      status: getStepStatus(3),
    },
    {
      title: "Make it your own",
      description: <EnvironmentSettings contentMap={contentMap} showOnlyGroup="Brand" />,
      isComplete: hasBranding || ($previewMode && $previewDbInitialized),
      status: getStepStatus(4),
    },
    {
      title: "Bootstrap your database",
      description:
        !hasTursoReady || !hasContentPrimed ? <DatabaseContentBootstrap /> : <Completed />,
      isComplete: hasTursoReady && hasContentPrimed,
      status: getStepStatus(5),
    },
    {
      title: "Publish your first page!",
      description: <NeedsContent hasAssemblyAI={hasAssemblyAI} />,
      isComplete: hasContentReady,
      status: getStepStatus(6),
    },
  ];

  useEffect(() => {
    const completionStates = [
      hasConcierge || $previewMode,
      hasAuth || $previewMode,
      hasTurso || gotTurso || ($previewMode && $previewDbInitialized),
      gotIntegrations || hasBranding || ($previewMode && $previewDbInitialized),
      hasBranding || ($previewMode && $previewDbInitialized),
      hasTursoReady && hasContentPrimed,
      hasContentReady,
    ];

    const newOpenSteps: Record<number, boolean> = {};
    let foundCurrent = false;

    completionStates.forEach((isComplete, index) => {
      if (!isComplete && !foundCurrent) {
        newOpenSteps[index] = true;
        foundCurrent = true;
      } else {
        newOpenSteps[index] = false;
      }
    });

    setOpenSteps(newOpenSteps);
  }, [
    hasConcierge,
    hasAuth,
    hasTurso,
    gotTurso,
    gotIntegrations,
    hasBranding,
    hasTursoReady,
    hasContent,
    hasContentReady,
    hasContentPrimed,
    $previewMode,
    $previewDbInitialized,
  ]);

  const getStepIcon = (step: SetupStep): ReactNode => {
    if (step.status === "locked") {
      return <LockClosedIcon className="h-6 w-6 text-mydarkgrey/30" />;
    }
    if (step.isComplete) {
      return <CheckCircleIcon className="h-6 w-6 text-mygreen" />;
    }
    return <InformationCircleIcon className="h-6 w-6 text-myorange" />;
  };

  const toggleStep = (index: number) => {
    setOpenSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div
      className="outline-2 outline-dashed outline-myblue/10 outline-offset-[-2px] my-4 bg-myblue/20 py-4"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
      }}
    >
      <div className="rounded-lg px-3.5 py-6 shadow-inner bg-white mx-4">
        <div className="flex flex-col space-y-8">
          <div className="relative">
            <h2 className="inline-block font-action text-myblue text-2xl md:text-3xl">
              Hello world!
            </h2>
          </div>

          <div className="flex flex-col space-y-4">
            {setupSteps.map((step, index) => (
              <div
                key={index}
                className={`border rounded-lg transition-colors ${
                  step.status === "locked"
                    ? "border-mylightgrey/10 bg-mylightgrey/5"
                    : "border-mylightgrey/20 bg-white"
                }`}
              >
                <button
                  className={`flex w-full justify-between rounded-lg px-4 py-4 text-left ${
                    step.status === "locked" ? "cursor-not-allowed" : "hover:bg-mylightgrey/10"
                  }`}
                  disabled={step.status === "locked"}
                  onClick={() => toggleStep(index)}
                >
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step)}
                    <span
                      className={`text-lg font-bold ${
                        step.status === "locked" ? "text-mydarkgrey/30" : "text-mydarkgrey"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <ChevronUpIcon
                    className={`${openSteps[index] ? "rotate-180 transform" : ""} h-5 w-5 ${
                      step.status === "locked" ? "text-mydarkgrey/30" : "text-mydarkgrey"
                    }`}
                  />
                </button>
                {openSteps[index] && (
                  <div className="px-4 pb-4 pt-2">
                    <div
                      className={`${
                        step.status === "locked" ? "text-mydarkgrey/30" : "text-mydarkgrey"
                      }`}
                    >
                      <div className="p-4">{step.description}</div>
                      {step.status === "locked" && (
                        <p className="mt-2 text-sm italic">
                          Complete the previous steps to unlock this step.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
