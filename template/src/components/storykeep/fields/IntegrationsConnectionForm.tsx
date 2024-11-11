import { useState, useCallback, useEffect } from "react";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import type { ChangeEvent } from "react";

interface IntegrationsConnectionFormProps {
  setGotIntegrations: (value: boolean) => void;
}

interface IntegrationSettings {
  PUBLIC_GOOGLE_SITE_VERIFICATION: string;
  PRIVATE_ASSEMBLYAI_API_KEY: string;
  PUBLIC_SHOPIFY_SHOP: string;
  PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: string;
  PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN: string;
}

const IntegrationsConnectionForm = ({ setGotIntegrations }: IntegrationsConnectionFormProps) => {
  const [formData, setFormData] = useState<IntegrationSettings>({
    PUBLIC_GOOGLE_SITE_VERIFICATION: "",
    PRIVATE_ASSEMBLYAI_API_KEY: "",
    PUBLIC_SHOPIFY_SHOP: "",
    PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: "",
    PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  async function fetchSettings() {
    try {
      const response = await fetch(`/api/concierge/storykeep/env`);
      const data = await response.json();
      if (data.success) {
        const newData = JSON.parse(data.data);
        const settings = {
          PUBLIC_GOOGLE_SITE_VERIFICATION: newData.PUBLIC_GOOGLE_SITE_VERIFICATION || "",
          PRIVATE_ASSEMBLYAI_API_KEY: newData.PRIVATE_ASSEMBLYAI_API_KEY || "",
          PUBLIC_SHOPIFY_SHOP: newData.PUBLIC_SHOPIFY_SHOP || "",
          PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN:
            newData.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "",
          PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN:
            newData.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN || "",
        };
        setFormData(settings);
        setIsLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching integration settings:", error);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  const validateGoogleAnalytics = (value: string) => {
    if (value && !value.startsWith("G-")) {
      return "Google Analytics ID should start with G-";
    }
    return "";
  };

  const validateAssemblyAI = (value: string) => {
    if (value && value.length < 32) {
      return "AssemblyAI key should be at least 32 characters";
    }
    return "";
  };

  const validateShopifyShop = (value: string) => {
    if (value && !value.includes(".myshopify.com")) {
      return "Shop URL should include .myshopify.com";
    }
    return "";
  };

  const validateShopifyToken = (value: string) => {
    if (value && value.length < 32) {
      return "Shopify token should be at least 32 characters";
    }
    return "";
  };

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (formData.PUBLIC_GOOGLE_SITE_VERIFICATION) {
      newErrors.PUBLIC_GOOGLE_SITE_VERIFICATION = validateGoogleAnalytics(
        formData.PUBLIC_GOOGLE_SITE_VERIFICATION
      );
    }
    if (formData.PRIVATE_ASSEMBLYAI_API_KEY) {
      newErrors.PRIVATE_ASSEMBLYAI_API_KEY = validateAssemblyAI(
        formData.PRIVATE_ASSEMBLYAI_API_KEY
      );
    }
    if (formData.PUBLIC_SHOPIFY_SHOP) {
      newErrors.PUBLIC_SHOPIFY_SHOP = validateShopifyShop(formData.PUBLIC_SHOPIFY_SHOP);
    }
    if (formData.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      newErrors.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN = validateShopifyToken(
        formData.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
      );
    }
    if (formData.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      newErrors.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN = validateShopifyToken(
        formData.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN
      );
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleSave = async () => {
    if (!validate() || isSaving) return;

    try {
      setIsSaving(true);

      const payload = Object.entries(formData).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const response = await fetch(`/api/concierge/storykeep/env`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save integration settings");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setGotIntegrations(true);
      }, 1000);
    } catch (error) {
      console.error("Error saving integration settings:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Failed to save settings. Please try again.",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setGotIntegrations(true);
  };

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-myorange/20 placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-md xs:leading-6";

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="bg-mygreen/10 p-4 rounded-md">
          <p className="text-black font-bold">
            <CheckCircleIcon className="inline-block h-5 w-5 mr-2" />
            Integration settings saved successfully
          </p>
        </div>
      )}

      {errors.submit && (
        <div className="bg-black/10 p-4 rounded-md">
          <p className="text-black font-bold">
            <ExclamationTriangleIcon className="inline-block h-5 w-5 mr-2" />
            {errors.submit}
          </p>
        </div>
      )}

      {!saveSuccess && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-mydarkgrey">Google Analytics</h3>
            <div>
              <label
                htmlFor="PUBLIC_GOOGLE_SITE_VERIFICATION"
                className="block text-sm font-bold text-mydarkgrey mb-1"
              >
                Google Analytics Measurement ID
              </label>
              <div className="relative">
                <input
                  id="PUBLIC_GOOGLE_SITE_VERIFICATION"
                  name="PUBLIC_GOOGLE_SITE_VERIFICATION"
                  type="text"
                  value={formData.PUBLIC_GOOGLE_SITE_VERIFICATION}
                  onChange={handleChange}
                  placeholder="G-XXXXXXXXXX"
                  className={commonInputClass}
                />
                {errors.PUBLIC_GOOGLE_SITE_VERIFICATION && (
                  <p className="text-sm text-myorange mt-1">
                    {errors.PUBLIC_GOOGLE_SITE_VERIFICATION}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-mydarkgrey">Assembly AI</h3>
            <div>
              <label
                htmlFor="PRIVATE_ASSEMBLYAI_API_KEY"
                className="block text-sm font-bold text-mydarkgrey mb-1"
              >
                API Key
              </label>
              <div className="relative">
                <input
                  id="PRIVATE_ASSEMBLYAI_API_KEY"
                  name="PRIVATE_ASSEMBLYAI_API_KEY"
                  type="password"
                  value={formData.PRIVATE_ASSEMBLYAI_API_KEY}
                  onChange={handleChange}
                  placeholder="Your Assembly AI API key"
                  className={commonInputClass}
                  autoComplete="new-password"
                />
                {errors.PRIVATE_ASSEMBLYAI_API_KEY && (
                  <p className="text-sm text-myorange mt-1">{errors.PRIVATE_ASSEMBLYAI_API_KEY}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-mydarkgrey">Shopify</h3>
            <div>
              <label
                htmlFor="PUBLIC_SHOPIFY_SHOP"
                className="block text-sm font-bold text-mydarkgrey mb-1"
              >
                Shop URL
              </label>
              <div className="relative">
                <input
                  id="PUBLIC_SHOPIFY_SHOP"
                  name="PUBLIC_SHOPIFY_SHOP"
                  type="text"
                  value={formData.PUBLIC_SHOPIFY_SHOP}
                  onChange={handleChange}
                  placeholder="your-store.myshopify.com"
                  className={commonInputClass}
                />
                {errors.PUBLIC_SHOPIFY_SHOP && (
                  <p className="text-sm text-myorange mt-1">{errors.PUBLIC_SHOPIFY_SHOP}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
                className="block text-sm font-bold text-mydarkgrey mb-1"
              >
                Public Access Token
              </label>
              <div className="relative">
                <input
                  id="PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
                  name="PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
                  type="password"
                  value={formData.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN}
                  onChange={handleChange}
                  placeholder="Public storefront access token"
                  className={commonInputClass}
                  autoComplete="new-password"
                />
                {errors.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN && (
                  <p className="text-sm text-myorange mt-1">
                    {errors.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
                className="block text-sm font-bold text-mydarkgrey mb-1"
              >
                Private Access Token
              </label>
              <div className="relative">
                <input
                  id="PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
                  name="PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
                  type="password"
                  value={formData.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN}
                  onChange={handleChange}
                  placeholder="Private storefront access token"
                  className={commonInputClass}
                  autoComplete="new-password"
                />
                {errors.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN && (
                  <p className="text-sm text-myorange mt-1">
                    {errors.PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-white bg-black rounded hover:bg-myorange disabled:bg-mydarkgrey disabled:cursor-not-allowed"
            >
              Skip Integrations
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-white bg-black rounded hover:bg-myorange disabled:bg-mydarkgrey disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Integration Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsConnectionForm;
