import { useState, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { Select } from "@ark-ui/react/select";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import { auth, loading, error, success, profile } from "@/store/auth";
import contactPersonaData from "../../../../config/contactPersona.json";
import type { SignupProps } from "@/types";
import "./SignUp.css"; // Import external CSS

// Define the Persona interface based on contactPersona.json
interface Persona {
  id: string;
  title: string;
  description: string;
  disabled?: boolean;
}

// Extract and type the contactPersona array from the JSON
const contactPersona: Persona[] = (contactPersonaData as { contactPersona: Persona[] })
  .contactPersona;

export const SignUp = ({ persona, prompt, clarifyConsent }: SignupProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [firstname, setFirstname] = useState("");
  const [codeword, setCodeword] = useState("");
  const [badSave, setBadSave] = useState(false);
  const [emailRegistered, setEmailRegistered] = useState(false);
  const [personaSelected, setPersonaSelected] = useState<Persona>(
    contactPersona.find((p) => p.id === persona) ||
      contactPersona.find((p) => p.title === "Major Updates Only") ||
      contactPersona[0]
  );

  const $loading = useStore(loading);
  const $success = useStore(success);
  const $auth = useStore(auth);
  const $profile = useStore(profile);

  // Create collection for Ark UI Select
  const personaCollection = useMemo(() => {
    return createListCollection({
      items: contactPersona.filter((p) => !p.disabled),
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, []);

  // Check for encrypted credentials and try to restore profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      if ($auth.encryptedEmail && $auth.encryptedCode && !$auth.unlockedProfile) {
        try {
          const response = await fetch("/api/turso/unlock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fingerprint: $auth.key,
              encryptedEmail: $auth.encryptedEmail,
              encryptedCode: $auth.encryptedCode,
            }),
          });

          const result = await response.json();
          if (result.success) {
            profile.set({
              firstname: result.data.firstname,
              contactPersona: result.data.contactPersona,
              email: result.data.email,
              shortBio: result.data.shortBio,
            });
            auth.setKey("unlockedProfile", "1");
            auth.setKey("hasProfile", "1");
          }
        } catch (e) {
          console.error("Error unlocking profile:", e);
        }
      }
    };

    checkExistingProfile();
  }, [$auth.encryptedEmail, $auth.encryptedCode, $auth.unlockedProfile]);

  // Initialize with existing profile data
  useEffect(() => {
    if ($profile.firstname && $profile.email) {
      setFirstname($profile.firstname);
      setEmail($profile.email);
      if ($profile.contactPersona) {
        const existingPersona = contactPersona.find((p) => p.id === $profile.contactPersona);
        if (existingPersona) {
          setPersonaSelected(existingPersona);
        }
      }
    }
  }, [$profile]);

  // Clear badSave message after 7 seconds
  useEffect(() => {
    if (badSave && !emailRegistered) {
      const timer = setTimeout(() => setBadSave(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [badSave, emailRegistered]);

  const redirectToProfileUnlock = () => {
    auth.setKey("showUnlock", "1");
    auth.setKey("lastEmail", email);
    auth.setKey("consent", "1");
    auth.setKey("active", "1");
    window.location.href = "/concierge/profile";
  };

  const handlePersonaChange = (details: { value: string[] }) => {
    const selectedId = details.value[0];
    if (selectedId) {
      const selected = contactPersona.find((p) => p.id === selectedId);
      if (selected) {
        setPersonaSelected(selected);
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (!firstname || !email || !codeword) return;

    try {
      loading.set(true);
      setEmailRegistered(false);

      const payload = {
        firstname,
        email,
        codeword,
        bio: "",
        persona: clarifyConsent ? personaSelected.id : "major",
        init: true,
        fingerprint: auth.get().key || undefined,
      };

      const response = await fetch("/api/turso/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        auth.setKey("hasProfile", "1");
        auth.setKey("consent", "1");
        auth.setKey("encryptedEmail", data.data.encryptedEmail);
        auth.setKey("encryptedCode", data.data.encryptedCode);
        auth.setKey("unlockedProfile", "1");

        profile.set({
          firstname: payload.firstname,
          contactPersona: payload.persona,
          email: payload.email,
          shortBio: payload.bio,
        });

        success.set(true);
        setSubmitted(true);
      } else {
        if (data.error?.includes("Email already registered")) {
          setEmailRegistered(true);
        }
        throw new Error(data.error || "Failed to save profile");
      }
    } catch (e) {
      console.error("Error during signup:", e);
      error.set(true);
      success.set(false);
      setBadSave(true);

      if (!emailRegistered) {
        profile.set({
          firstname: undefined,
          contactPersona: undefined,
          email: undefined,
          shortBio: undefined,
        });
        auth.setKey("hasProfile", undefined);
        auth.setKey("encryptedEmail", undefined);
        auth.setKey("encryptedCode", undefined);
        auth.setKey("unlockedProfile", undefined);
      }
    } finally {
      loading.set(false);
    }
  }

  // Render for existing profile
  if (($auth.hasProfile === "1" || $auth.encryptedEmail) && $profile.firstname) {
    return (
      <div className="p-6 bg-white rounded-md shadow-inner border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Signed Up</h2>
        <p className="text-lg text-gray-700 mb-4">Welcome back, {$profile.firstname}!</p>
        <p className="text-sm">
          <a
            href="/concierge/profile"
            className="text-cyan-700 hover:text-cyan-600 font-bold underline transition-colors"
          >
            Manage your profile
          </a>{" "}
          to update your preferences.
        </p>
      </div>
    );
  }

  // Render for successful signup
  if ($success && submitted) {
    return (
      <div className="p-6 bg-white rounded-md shadow-inner border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
        <p className="text-lg text-gray-700 mb-4">Thanks for signing up, {firstname}!</p>
        <p className="text-sm">
          <a
            href="/concierge/profile"
            className="text-cyan-700 hover:text-cyan-600 font-bold underline transition-colors"
          >
            Complete your profile
          </a>{" "}
          to customize your preferences. Remember your code word to manage your preferences later.
        </p>
      </div>
    );
  }

  // Render for email already registered
  if (emailRegistered) {
    return (
      <div className="p-6 bg-orange-50 rounded-md shadow-inner border border-orange-200">
        <h2 className="text-2xl font-bold text-orange-700 mb-2">Email Already Registered</h2>
        <p className="text-md text-gray-700 mb-4">
          The email address <strong>{email}</strong> is already registered.
        </p>
        <p className="text-md mb-4">Would you like to unlock your existing profile instead?</p>
        <div className="flex justify-center">
          <button
            onClick={redirectToProfileUnlock}
            className="px-6 py-2 bg-cyan-700 text-white font-bold text-sm rounded-md hover:bg-cyan-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Unlock My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    // Use Astro directive like `client:load` or `client:only="react"` in your Astro file
    <div className="p-4 bg-white rounded-md shadow-inner border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{prompt}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="firstname" className="block text-sm font-bold text-gray-700 mb-1">
            First Name
          </label>
          <input
            type="text"
            id="firstname"
            name="firstname"
            placeholder="First name"
            autoComplete="given-name"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:border-cyan-600 focus:ring-cyan-600 focus:ring-2 focus:outline-none ${
              submitted && !firstname ? "border-red-500" : "border-gray-300"
            }`}
          />
          {submitted && !firstname && (
            <p className="text-red-500 text-xs mt-1">Please enter your first name</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:border-cyan-600 focus:ring-cyan-600 focus:ring-2 focus:outline-none ${
              submitted && !firstname ? "border-red-500" : "border-gray-300"
            }`}
          />
          {submitted && !email && (
            <p className="text-red-500 text-xs mt-1">Please enter your email address</p>
          )}
        </div>

        <div>
          <label htmlFor="codeword" className="block text-sm font-bold text-gray-700 mb-1">
            Code Word
          </label>
          <input
            type="password"
            id="codeword"
            name="codeword"
            placeholder="Choose a code word"
            autoComplete="new-password"
            value={codeword}
            onChange={(e) => setCodeword(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:border-cyan-600 focus:ring-cyan-600 focus:ring-2 focus:outline-none ${
              submitted && !codeword ? "border-red-500" : "border-gray-300"
            }`}
          />
          {submitted && !codeword && (
            <p className="text-red-500 text-xs mt-1">Please choose a code word</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Remember this code word to manage your preferences later.
          </p>
        </div>

        {clarifyConsent && (
          <div>
            <Select.Root
              collection={personaCollection}
              value={[personaSelected.id]}
              onValueChange={handlePersonaChange}
              positioning={{ sameWidth: true }}
            >
              <Select.Label className="block text-sm font-bold text-gray-700 mb-1">
                Contact Preferences
              </Select.Label>
              <Select.Control className="relative">
                <Select.Trigger className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-cyan-600 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-600">
                  <Select.ValueText className="block truncate">
                    {personaSelected.title}
                  </Select.ValueText>
                  <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="z-50 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {personaCollection.items.map((option) => (
                      <Select.Item
                        key={option.id}
                        item={option}
                        className="persona-item relative cursor-default select-none py-2 pl-10 pr-4 text-black"
                      >
                        <div className="flex flex-col">
                          <Select.ItemText className="block truncate font-bold">
                            {option.title}
                          </Select.ItemText>
                          <span className="text-xs text-black">{option.description}</span>
                        </div>
                        <Select.ItemIndicator className="persona-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={$loading}
            className={`w-full px-4 py-2 text-sm font-bold rounded-md shadow-sm text-white bg-cyan-700 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors ${
              $loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {$loading ? "Signing up..." : "Sign up"}
          </button>
        </div>

        {badSave && !emailRegistered && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="text-sm font-bold">Signup Failed</p>
            <p className="text-sm">
              Sorry, we couldn't sign you up. Please try again or use a different email address.
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default SignUp;
