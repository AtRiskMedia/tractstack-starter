import { useState, useRef, type ChangeEvent, type FormEvent, useEffect } from "react";

interface RegistrationFormProps {
  isMultiTenant: boolean;
}

interface FormValues {
  tenantId: string;
  name: string;
  email: string;
}

interface FormErrors {
  tenantId?: string;
  name?: string;
  email?: string;
  general?: string;
}

export default function RegistrationForm({ isMultiTenant }: RegistrationFormProps) {
  const [formValues, setFormValues] = useState<FormValues>({
    tenantId: "",
    name: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [formState, setFormState] = useState<
    "idle" | "checking" | "submitting" | "success" | "error"
  >("idle");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const checkTimeout = useRef<NodeJS.Timeout | null>(null);

  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear related error when user types
    setFormErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));

    setFormValues((prev) => ({ ...prev, [name]: value }));

    // For tenant ID, check availability after typing stops
    if (name === "tenantId" && value.length >= 3) {
      // Clear previous timeout
      if (checkTimeout.current) {
        clearTimeout(checkTimeout.current);
      }

      // Set new timeout to check availability
      checkTimeout.current = setTimeout(() => {
        checkTenantAvailability(value);
      }, 500);
    }
  };

  // Check if tenant ID is available
  const checkTenantAvailability = async (tenantId: string) => {
    // Skip check if not in multi-tenant mode or tenant ID is too short
    if (!isMultiTenant || tenantId.length < 3) return;

    try {
      setIsChecking(true);
      setFormState("checking");

      const response = await fetch(`/api/tenant/check?id=${encodeURIComponent(tenantId)}`);
      const data = await response.json();

      if (!data.success) {
        setFormErrors((prev) => ({ ...prev, tenantId: "Error checking availability" }));
        return;
      }

      if (!data.available) {
        setFormErrors((prev) => ({
          ...prev,
          tenantId: data.reason || "This tenant ID is not available",
        }));
      } else {
        // Clear any previous tenant ID error if now available
        setFormErrors((prev) => ({ ...prev, tenantId: undefined }));
      }
    } catch (error) {
      console.error("Error checking tenant availability:", error);
      setFormErrors((prev) => ({ ...prev, tenantId: "Error checking availability" }));
    } finally {
      setIsChecking(false);
      setFormState("idle");
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    // Subdomain validation
    if (!formValues.tenantId.trim()) {
      errors.tenantId = "Subdomain is required";
      isValid = false;
    } else if (!/^[a-zA-Z0-9-]+$/.test(formValues.tenantId)) {
      errors.tenantId = "Subdomain can only contain letters, numbers, and hyphens";
      isValid = false;
    } else if (formValues.tenantId.length < 3) {
      errors.tenantId = "Subdomain must be at least 3 characters";
      isValid = false;
    } else if (formValues.tenantId.length > 12) {
      errors.tenantId = "Subdomain must be less than 12 characters";
      isValid = false;
    }

    // Name validation
    if (!formValues.name.trim()) {
      errors.name = "Name is required";
      isValid = false;
    }

    // Email validation
    if (!formValues.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // Check form validity on input change
  useEffect(() => {
    // Skip expensive validation if we're already submitting
    if (isSubmitting) return;

    // Real-time validation
    let isValid = true;

    // Check if all fields have values
    if (!formValues.tenantId.trim()) isValid = false;
    if (!formValues.name.trim()) isValid = false;
    if (!formValues.email.trim()) isValid = false;

    // Check basic format validation
    if (
      formValues.tenantId &&
      (!/^[a-zA-Z0-9-]+$/.test(formValues.tenantId) ||
        formValues.tenantId.length < 3 ||
        formValues.tenantId.length > 12)
    ) {
      isValid = false;
    }

    if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      isValid = false;
    }

    // Check if there are any existing errors
    if (formErrors.tenantId || formErrors.name || formErrors.email || formErrors.general) {
      isValid = false;
    }

    setIsFormValid(isValid);
  }, [formValues, formErrors, isSubmitting]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Return early if already submitting
    if (isSubmitting) return;

    // Validate form
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setFormState("submitting");
      setFormErrors({});

      const response = await fetch("/api/tenant/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.emailExists) {
          setFormErrors({
            email: "This email is already associated with a tenant",
            general: `You already have a ${data.tenantId} tenant`,
          });
        } else if (!data.available) {
          setFormErrors({
            tenantId: data.error || "This tenant ID is not available",
          });
        } else {
          setFormErrors({
            general: data.error || "An error occurred creating your tenant",
          });
        }
        setFormState("error");
        return;
      }

      // Success state
      setFormState("success");
      setSuccessMessage(
        data.emailSent
          ? `Success! We've sent an activation email to ${formValues.email}. Please check your inbox to complete the setup.`
          : `Your tenant has been reserved, but we couldn't send the activation email. Please contact support.`
      );
    } catch (error) {
      console.error("Error submitting form:", error);
      setFormErrors({
        general: "An unexpected error occurred. Please try again later.",
      });
      setFormState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formState === "success") {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
        <div className="text-center mb-6">
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
          <h2 className="mt-3 text-lg font-bold text-mydarkgrey">Registration Successful!</h2>
          <p className="mt-2 text-myblue">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="space-y-6">
        {formErrors.general && (
          <div className="bg-myred/10 p-4 rounded-md">
            <p className="text-myred text-sm">{formErrors.general}</p>
          </div>
        )}

        <div>
          <label htmlFor="tenantId" className="block text-sm font-bold text-mydarkgrey">
            Subdomain
          </label>
          <div className="mt-1 relative">
            <input
              type="text"
              id="tenantId"
              name="tenantId"
              value={formValues.tenantId}
              onChange={handleChange}
              placeholder="your-subdomain"
              className={`w-full px-3 py-2 border ${
                formErrors.tenantId ? "border-myred" : "border-mylightgrey"
              } rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue`}
              disabled={isSubmitting}
            />
            {isChecking && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="animate-spin h-5 w-5 text-mylightgrey"
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
          </div>
          {formErrors.tenantId && <p className="mt-1 text-sm text-myred">{formErrors.tenantId}</p>}
          <p className="mt-1 text-xs text-mylightgrey">
            3-12 characters, letters, numbers, and hyphens only. This will be your subdomain:
            <span className="font-semibold">
              {formValues.tenantId ? formValues.tenantId : "your-tenant-id"}.sandbox.tractstack.com
            </span>
          </p>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-bold text-mydarkgrey">
            Your Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="name"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              placeholder="Charlie Bucket"
              className={`w-full px-3 py-2 border ${
                formErrors.name ? "border-myred" : "border-mylightgrey"
              } rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue`}
              disabled={isSubmitting}
            />
          </div>
          {formErrors.name && <p className="mt-1 text-sm text-myred">{formErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-bold text-mydarkgrey">
            Email Address
          </label>
          <div className="mt-1">
            <input
              type="email"
              id="email"
              name="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-3 py-2 border ${
                formErrors.email ? "border-myred" : "border-mylightgrey"
              } rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue`}
              disabled={isSubmitting}
            />
          </div>
          {formErrors.email && <p className="mt-1 text-sm text-myred">{formErrors.email}</p>}
          <p className="mt-1 text-xs text-mylightgrey">
            We'll send an activation link to this email address
          </p>
        </div>

        <div>
          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white ${
              isFormValid ? "bg-myblue hover:bg-myorange" : "bg-mylightgrey cursor-not-allowed"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myblue`}
            disabled={isSubmitting || isChecking || !isFormValid}
          >
            {isSubmitting ? (
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
                Creating Tenant...
              </span>
            ) : (
              "Register Your Sandbox"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
