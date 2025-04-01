import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { Listbox, Transition } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import { classNames } from "@/utils/common/helpers";
import { auth, loading, error, success, profile } from "@/store/auth";
import contactPersonaData from "../../../../config/contactPersona.json";
import type { SignupProps } from "@/types";

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

  // Check for encrypted credentials and try to restore profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      // If we have encrypted credentials but no unlocked profile, try to unlock
      if ($auth.encryptedEmail && $auth.encryptedCode && !$auth.unlockedProfile) {
        try {
          // Try to unlock the profile using stored credentials
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
            // Set the profile data
            profile.set({
              firstname: result.data.firstname,
              contactPersona: result.data.contactPersona,
              email: result.data.email,
              shortBio: result.data.shortBio,
            });

            // Update auth state
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

  // Initialize with existing profile data if available
  useEffect(() => {
    if ($profile.firstname && $profile.email) {
      setFirstname($profile.firstname);
      setEmail($profile.email);

      // Set persona if available
      if ($profile.contactPersona) {
        const existingPersona = contactPersona.find((p) => p.id === $profile.contactPersona);
        if (existingPersona) {
          setPersonaSelected(existingPersona);
        }
      }
    }
  }, [$profile]);

  useEffect(() => {
    if (badSave && !emailRegistered) {
      setTimeout(() => setBadSave(false), 7000);
    }
  }, [badSave, emailRegistered]);

  const redirectToProfileUnlock = () => {
    auth.setKey("showUnlock", "1");
    auth.setKey("lastEmail", email);
    auth.setKey("consent", "1");
    auth.setKey("active", "1");
    window.location.href = "/concierge/profile";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    if (!firstname || !email || !codeword) return;

    try {
      loading.set(true);
      setEmailRegistered(false);

      const payload: {
        firstname: string;
        email: string;
        codeword: string;
        bio: string;
        persona: string;
        init: boolean;
        fingerprint?: string;
      } = {
        firstname,
        email,
        codeword,
        bio: "",
        persona: clarifyConsent ? personaSelected.id : "major",
        init: true,
      };

      const authData = auth.get();
      if (authData && authData.key) {
        payload.fingerprint = authData.key;
      }

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
        loading.set(false);
        setSubmitted(true);
      } else {
        console.error("Failed to save profile:", data.error || "Unknown error");

        if (data.error && data.error.includes("Email already registered")) {
          setEmailRegistered(true);
        }

        throw new Error(data.error || "Failed to save profile");
      }
    } catch (e) {
      console.error("Error during signup:", e);
      error.set(true);
      success.set(false);
      loading.set(false);
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
    }
  }

  // If user already has a profile, or we have encrypted credentials, show appropriate message
  if (($auth.hasProfile === "1" || $auth.encryptedEmail) && $profile.firstname) {
    return (
      <div className="bg-mywhite p-6 rounded-lg border border-mydarkgrey">
        <h2 className="text-myblack font-bold text-2xl mb-2">Already Signed Up</h2>
        <p className="text-black text-xl mb-4">Welcome back, {$profile.firstname}!</p>
        <p className="text-md mt-2">
          <a href="/concierge/profile" className="text-myblue hover:text-black underline font-bold">
            Manage your profile
          </a>{" "}
          to update your preferences.
        </p>
      </div>
    );
  }

  if ($success && submitted) {
    return (
      <div className="bg-mywhite p-6 rounded-lg border border-mydarkgrey">
        <h2 className="text-myblack font-bold text-2xl mb-2">Success!</h2>
        <p className="text-black text-xl mb-4">Thanks for signing up, {firstname}!</p>
        <p className="text-md mt-2">
          <a href="/concierge/profile" className="text-myblue hover:text-black underline font-bold">
            Complete your profile
          </a>{" "}
          to customize your preferences. Remember your code word to manage your preferences later.
        </p>
      </div>
    );
  }

  if (emailRegistered) {
    return (
      <div className="bg-myorange/20 p-6 rounded-lg border border-myorange">
        <h2 className="text-myorange font-bold text-2xl mb-2">Email Already Registered</h2>
        <p className="text-black text-md mb-4">
          It looks like the email address <strong>{email}</strong> is already registered with us.
        </p>
        <p className="text-md mb-4">Would you like to unlock your existing profile instead?</p>
        <div className="flex justify-center mt-4">
          <button
            onClick={redirectToProfileUnlock}
            className="px-6 py-3 bg-cyan-700 text-white font-bold text-md rounded-md hover:bg-cyan-600 transition-colors"
          >
            Unlock My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-mydarkgrey/20">
      <h3 className="text-lg font-bold text-black mb-4">{prompt}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="firstname" className="block text-sm font-medium text-mydarkgrey mb-1">
            First Name
          </label>
          <input
            type="text"
            id="firstname"
            name="firstname"
            placeholder="First name"
            autoComplete="off"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            className={classNames(
              "w-full px-3 py-2 border rounded-md shadow-sm placeholder-mydarkgrey/50 focus:border-myorange focus:ring-myorange",
              submitted && !firstname ? "border-red-500" : "border-mydarkgrey"
            )}
          />
          {submitted && !firstname && (
            <p className="text-red-500 text-xs mt-1">Please enter your name</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-mydarkgrey mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email address"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={classNames(
              "w-full px-3 py-2 border rounded-md shadow-sm placeholder-mydarkgrey/50 focus:border-myorange focus:ring-myorange",
              submitted && !email ? "border-red-500" : "border-mydarkgrey"
            )}
          />
          {submitted && !email && (
            <p className="text-red-500 text-xs mt-1">Please enter your email</p>
          )}
        </div>

        <div>
          <label htmlFor="codeword" className="block text-sm font-medium text-mydarkgrey mb-1">
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
            className={classNames(
              "w-full px-3 py-2 border rounded-md shadow-sm placeholder-mydarkgrey/50 focus:border-myorange focus:ring-myorange",
              submitted && !codeword ? "border-red-500" : "border-mydarkgrey"
            )}
          />
          {submitted && !codeword && (
            <p className="text-red-500 text-xs mt-1">Please choose a code word</p>
          )}
          <p className="text-xs text-mydarkgrey mt-1">
            Remember this code word - you'll need it to update your preferences later
          </p>
        </div>

        {clarifyConsent && (
          <div>
            <Listbox value={personaSelected} onChange={setPersonaSelected}>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-myorange focus:outline-none text-sm">
                  <span className="block truncate">{personaSelected.title}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Transition
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Listbox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {contactPersona.map((option) => (
                      <Listbox.Option
                        key={option.id}
                        className={({ active }) =>
                          classNames(
                            active ? "bg-myorange/10 text-black" : "text-black",
                            "relative cursor-default select-none py-2 pl-3 pr-9"
                          )
                        }
                        value={option}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={classNames(
                                selected ? "font-bold" : "font-normal",
                                "block truncate"
                              )}
                            >
                              {option.title}
                            </span>
                            <span className="text-xs text-mydarkgrey ml-2">
                              {option.description}
                            </span>
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={$loading}
            className={classNames(
              "w-full px-4 py-2 text-sm font-bold rounded-md shadow-sm",
              "bg-cyan-700 text-white hover:bg-cyan-600",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {$loading ? "Signing up..." : "Sign up"}
          </button>
        </div>

        {badSave && !emailRegistered && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
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
