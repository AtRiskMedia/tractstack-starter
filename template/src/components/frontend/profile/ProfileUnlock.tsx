import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import ChevronRightIcon from "@heroicons/react/20/solid/ChevronRightIcon";
import { auth, profile, error, success, loading } from "@/store/auth";
import { heldBeliefs } from "@/store/beliefs";
import { classNames } from "@/utils/common/helpers";
import type { BeliefStore } from "@/types";

export async function goUnlockProfile(payload: { email: string; codeword: string }) {
  try {
    const response = await fetch("/api/turso/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        fingerprint: auth.get().key,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      error.set(true);
      success.set(false);
      loading.set(undefined);
      profile.set({
        firstname: undefined,
        contactPersona: undefined,
        email: undefined,
        shortBio: undefined,
      });
      auth.setKey(`unlockedProfile`, undefined);
      return false;
    }

    profile.set({
      firstname: result.data.firstname,
      contactPersona: result.data.contactPersona,
      email: result.data.email,
      shortBio: result.data.shortBio,
    });

    // Set beliefs if present, and add KnownLead belief
    if (result.data.beliefs) {
      try {
        const parsedBeliefs = JSON.parse(result.data.beliefs) as BeliefStore[];

        // Add or update KnownLead belief
        const knownLeadIndex = parsedBeliefs.findIndex((b: BeliefStore) => b.slug === "KnownLead");
        if (knownLeadIndex >= 0) {
          parsedBeliefs[knownLeadIndex].verb = "BELIEVES_YES";
        } else {
          parsedBeliefs.push({
            id: "KnownLead",
            slug: "KnownLead",
            verb: "BELIEVES_YES",
          });
        }

        heldBeliefs.set(parsedBeliefs);
      } catch (e) {
        console.error("Error parsing beliefs:", e);
      }
    } else {
      // No existing beliefs, set just the KnownLead belief
      heldBeliefs.set([
        {
          id: "KnownLead",
          slug: "KnownLead",
          verb: "BELIEVES_YES",
        },
      ]);
    }

    auth.setKey(`encryptedEmail`, result.data.encryptedEmail);
    auth.setKey(`encryptedCode`, result.data.encryptedCode);
    auth.setKey(`unlockedProfile`, `1`);
    auth.setKey(`hasProfile`, `1`);
    success.set(true);
    loading.set(false);
    return true;
  } catch (e) {
    error.set(true);
    success.set(false);
    loading.set(undefined);
    return false;
  }
}

interface ProfileUnlockProps {
  initialEmail?: string;
}

export const ProfileUnlock = ({ initialEmail }: ProfileUnlockProps) => {
  const [submitted, setSubmitted] = useState<boolean | undefined>(undefined);
  const [email, setEmail] = useState(initialEmail || ``);
  const [badLogin, setBadLogin] = useState(false);
  const [codeword, setCodeword] = useState(``);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBadLogin(false);
    setSubmitted(true);
    if (codeword && email) {
      const payload = {
        email,
        codeword,
      };
      goUnlockProfile(payload).then((res) => {
        if (!res) setBadLogin(true);
      });
    }
  };

  useEffect(() => {
    if (badLogin) {
      setTimeout(() => setBadLogin(false), 7000);
    }
  }, [badLogin]);

  return (
    <>
      <h3 className="font-action text-xl py-6 text-myblue">
        Welcome Back. Unlock your profile &gt;
      </h3>
      <p className="text-md pb-6">
        Don't have a profile?
        <button
          className="text-myblue hover:text-black underline ml-3"
          onClick={() => auth.setKey(`hasProfile`, undefined)}
        >
          Create one
        </button>
        .
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 pt-6 px-4">
            <label htmlFor="email" className="block text-sm text-mydarkgrey">
              Email address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              autoComplete="new-password"
              aria-autocomplete="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={classNames(
                `text-md bg-white p-3 mt-2 block w-full rounded-md shadow-sm focus:border-myorange focus:ring-myorange`,
                submitted && email === `` ? `border-red-500` : `border-mydarkgrey`
              )}
            />
            {submitted && email === `` && (
              <span className="text-xs px-4 text-red-500">Required field.</span>
            )}
          </div>

          <div className="col-span-3 pt-6 px-4">
            <label htmlFor="codeword" className="block text-sm text-mydarkgrey">
              Enter your secret code word to unlock your account:
            </label>
            <input
              type="password"
              name="codeword"
              id="codeword"
              autoComplete="new-password"
              aria-autocomplete="none"
              value={codeword}
              onChange={(e) => setCodeword(e.target.value)}
              className={classNames(
                `text-md bg-white p-3 mt-2 block w-full rounded-md shadow-sm focus:border-myorange focus:ring-myorange`,
                submitted && codeword === `` ? `border-red-500` : `border-mydarkgrey`
              )}
            />
            {submitted && codeword === `` && (
              <span className="text-xs px-4 text-red-500">Required field.</span>
            )}
          </div>
          {badLogin ? (
            <div className="col-span-3 flex justify-center align-center py-12">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md max-w-md w-full">
                <p className="text-sm font-bold">Login Failed</p>
                <p className="text-sm">
                  The email or code word you entered is incorrect. Please try again.
                </p>
              </div>
            </div>
          ) : null}

          {codeword !== `` ? (
            <div className="col-span-3 flex justify-center align-center py-12">
              <button
                type="submit"
                className="inline-flex rounded-md bg-myorange/10 hover:bg-black hover:text-white px-3.5 py-1.5 text-base leading-7 text-black shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-myorange"
              >
                <span className="pr-4">Unlock Profile</span>
                <ChevronRightIcon className="h-5 w-5 mr-3" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </>
  );
};
