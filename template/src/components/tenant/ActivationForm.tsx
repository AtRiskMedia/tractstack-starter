import { useState } from "react";
import { ulid } from "ulid";
import { auth } from "@/store/auth";
import type { FormEvent } from "react";

interface ActivationFormProps {
  token: string;
  tenantDetails: { id: string; email: string; name: string } | null;
  verificationError: string | null;
}

export default function ActivationForm({
  token,
  tenantDetails,
  verificationError,
}: ActivationFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [useCustomEditorPassword, setUseCustomEditorPassword] = useState(false);
  const [editorPassword, setEditorPassword] = useState("");
  const [formState, setFormState] = useState<
    "verifying" | "ready" | "invalid" | "submitting" | "success" | "error" | "activating"
  >(verificationError ? "invalid" : tenantDetails ? "ready" : "verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(verificationError);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Simplified password validation
  // Only check that password exists and passwords match
  const isPasswordValid = password.length > 0;
  const doPasswordsMatch = password === confirmPassword;

  // For editor password, only check it's not empty if the option is enabled
  const isEditorPasswordValid = !useCustomEditorPassword || editorPassword.length > 0;

  // Button should be enabled when passwords match and aren't empty
  const isSubmitEnabled =
    isPasswordValid && doPasswordsMatch && isEditorPasswordValid && formState !== "submitting";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSubmitEnabled) return;

    setFormState("submitting");
    setErrorMessage(null);

    try {
      // Submit to claim endpoint first
      const claimResponse = await fetch("/api/tenant/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          editorPassword: useCustomEditorPassword ? editorPassword : undefined,
        }),
      });

      const claimData = await claimResponse.json();

      if (!claimData.success) {
        setFormState("error");
        setErrorMessage(claimData.error || "Failed to claim tenant");
        return;
      }

      try {
        const fingerprint = auth?.get()?.key || ulid();
        if (!tenantDetails || !tenantDetails.email) {
          console.error("Missing email from tenantDetails");
          throw new Error("Missing email information");
        }
        const currentDate = new Date().toLocaleDateString();
        const leadResponse = await fetch("/api/turso/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstname: tenantDetails?.name || tenantDetails.id,
            email: tenantDetails.email,
            codeword: password,
            persona: "major",
            bio: `Created first Tract Stack on ${currentDate}`,
            fingerprint: fingerprint,
            init: true,
          }),
        });

        const leadData = await leadResponse.json();
      } catch (leadError) {
        console.error("Error creating lead:", leadError);
        // Continue with activation even if lead creation fails
      }

      // Now that tenant is claimed, start activation process
      setFormState("activating");
      setProgress(25);
      setProgressMessage("Setting up your tenant...");

      // Default init config
      const initConfig = {
        BRAND_COLOURS: "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
        THEME: "light",
        WORDMARK_MODE: "default",
      };

      // Begin tenant activation with init config
      const activateResponse = await fetch("/api/tenant/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: claimData.tenantId,
          initConfig: initConfig,
        }),
      });

      const activateData = await activateResponse.json();

      if (!activateData.success) {
        setFormState("error");
        setErrorMessage(activateData.error || "Failed to activate tenant");
        return;
      }

      // Activation successful
      setProgress(100);
      setProgressMessage("Activation complete!");
      setFormState("success");

      // Redirect to tenant domain after a short delay
      setTimeout(() => {
        const tenantUrl = `https://${claimData.tenantId}.sandbox.freewebpress.com`;
        window.location.href = tenantUrl;
      }, 3000);
    } catch (error) {
      setFormState("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  };

  // Show different content based on form state
  if (formState === "verifying") {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
        <div className="flex justify-center items-center space-x-2">
          <svg
            className="animate-spin h-5 w-5 text-myblue"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-mydarkgrey">Verifying activation token...</span>
        </div>
      </div>
    );
  }

  if (formState === "invalid") {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mt-3 text-lg font-bold text-mydarkgrey">Invalid Activation Token</h2>
          <p className="mt-2 text-myred">{errorMessage}</p>
          <div className="mt-6">
            <a
              href="/sandbox/claim"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-myblue hover:bg-myorange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myblue"
            >
              Return to Registration
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (formState === "activating" || formState === "success") {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
        <div className="text-center mb-6">
          {formState === "success" ? (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg
                className="animate-spin h-6 w-6 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}
          <h2 className="mt-3 text-lg font-bold text-mydarkgrey">
            {formState === "success" ? "Activation Complete!" : "Activating Your Sandbox"}
          </h2>
          <p className="mt-2 text-mydarkgrey">
            {formState === "success"
              ? "Redirecting you to your new TractStack Sandbox..."
              : progressMessage}
          </p>
        </div>

        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                formState === "success" ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-myred/10 p-4 rounded-md">
            <p className="text-myred text-sm">{errorMessage}</p>
          </div>
        )}

        {tenantDetails && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-myblue text-sm">
              Setting up tenant: <strong>{tenantDetails.id}.sandbox.freewebpress.com</strong>
            </p>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-bold text-mydarkgrey">
            Admin Password
          </label>
          <div className="mt-1">
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-mylightgrey rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue"
              required
            />
          </div>
          <p className="mt-1 text-xs text-mylightgrey">
            Enter any password you'd like to use for this sandbox
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-bold text-mydarkgrey">
            Confirm Admin Password
          </label>
          <div className="mt-1">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2 border ${
                confirmPassword && password !== confirmPassword
                  ? "border-myred"
                  : "border-mylightgrey"
              } rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue`}
              required
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-myred">Passwords do not match</p>
          )}
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="useCustomEditorPassword"
              name="useCustomEditorPassword"
              type="checkbox"
              checked={useCustomEditorPassword}
              onChange={(e) => setUseCustomEditorPassword(e.target.checked)}
              className="h-4 w-4 text-myblue border-mylightgrey rounded focus:ring-myblue"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="useCustomEditorPassword" className="font-bold text-mydarkgrey">
              Use different password for Editors
            </label>
            <p className="text-mylightgrey">
              Create a separate password for users who can edit but not administer your site
            </p>
          </div>
        </div>

        {useCustomEditorPassword && (
          <div>
            <label htmlFor="editorPassword" className="block text-sm font-bold text-mydarkgrey">
              Editor Password
            </label>
            <div className="mt-1">
              <input
                type="password"
                id="editorPassword"
                name="editorPassword"
                value={editorPassword}
                onChange={(e) => setEditorPassword(e.target.value)}
                className="w-full px-3 py-2 border border-mylightgrey rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue"
                required={useCustomEditorPassword}
              />
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={!isSubmitEnabled}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white ${
              isSubmitEnabled ? "bg-myblue hover:bg-myorange" : "bg-mylightgrey cursor-not-allowed"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myblue`}
          >
            {formState === "submitting" ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Activate Sandbox"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
