import { useState, useEffect } from "react";

interface ResendFormProps {
  tenantId?: string;
}

export default function ResendForm({ tenantId }: ResendFormProps) {
  const [email, setEmail] = useState("");
  const [inputTenantId, setInputTenantId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Initialize the tenant ID from props if available
  useEffect(() => {
    if (tenantId) {
      setInputTenantId(tenantId);
    }
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate inputs
    const errors = [];
    if (!inputTenantId || !inputTenantId.trim()) {
      errors.push("Please enter your subdomain");
    }

    if (!email || !email.trim()) {
      errors.push("Please enter your email address");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Please enter a valid email address");
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/tenant/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenantId: inputTenantId, email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Activation email sent to ${email}. Please check your inbox.`);
        // Clear form if successful
        if (!tenantId) {
          setInputTenantId("");
        }
        setEmail("");
      } else {
        setError(data.error || "Failed to send activation email. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {message && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700 text-sm">{message}</p>
        </div>
      )}
      {error && (
        <div className="bg-myred/10 p-4 rounded-md">
          <p className="text-myred text-sm">{error}</p>
        </div>
      )}

      {/* Tenant ID field - only shown if not provided in props */}
      {!tenantId && (
        <div>
          <label htmlFor="tenantId" className="block text-sm font-bold text-mydarkgrey">
            Your Subdomain
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="tenantId"
              value={inputTenantId}
              onChange={(e) => setInputTenantId(e.target.value)}
              className="w-full px-3 py-2 border border-mylightgrey rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue"
              placeholder="your-subdomain"
              required
            />
          </div>
          <p className="mt-1 text-xs text-mylightgrey">
            Enter the subdomain you registered (example: {inputTenantId || "your-subdomain"}
            .sandbox.freewebpress.com)
          </p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-bold text-mydarkgrey">
          Your Email Address
        </label>
        <div className="mt-1">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-mylightgrey rounded-md shadow-sm focus:outline-none focus:ring-myblue focus:border-myblue"
            placeholder="Enter the email you used to register"
            required
          />
        </div>
        <p className="mt-1 text-xs text-mylightgrey">
          Enter the email address you used during registration
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-myblue hover:bg-myorange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myblue"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          "Resend Activation Email"
        )}
      </button>
    </form>
  );
}
