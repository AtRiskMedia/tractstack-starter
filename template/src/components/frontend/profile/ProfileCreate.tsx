/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { Select } from "@ark-ui/react/select";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import { useStore } from "@nanostores/react";
import ChevronRightIcon from "@heroicons/react/20/solid/ChevronRightIcon";
import ChevronDownIcon from "@heroicons/react/20/solid/ChevronDownIcon";
import ArrowPathRoundedSquareIcon from "@heroicons/react/24/outline/ArrowPathRoundedSquareIcon";
import BellSlashIcon from "@heroicons/react/24/outline/BellSlashIcon";
import BoltIcon from "@heroicons/react/24/outline/BoltIcon";
import ChatBubbleBottomCenterIcon from "@heroicons/react/24/outline/ChatBubbleBottomCenterIcon";
import { newProfile, auth, profile, error, success, loading } from "@/store/auth";
import { classNames } from "@/utils/common/helpers";
import { contactPersona } from "../../../../config/contactPersona.json";
import type { FormEvent } from "react";

async function goSaveProfile(payload: {
  firstname: string;
  email: string;
  codeword: string;
  persona: string;
  bio: string;
  init: boolean;
}) {
  try {
    const response = await fetch("/api/turso/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
      auth.setKey(`hasProfile`, undefined);
      return false;
    }

    profile.set({
      firstname: payload.firstname,
      contactPersona: payload.persona,
      email: payload.email,
      shortBio: payload.bio,
    });

    // Store encrypted values
    auth.setKey(`encryptedEmail`, result.data.encryptedEmail);
    auth.setKey(`encryptedCode`, result.data.encryptedCode);
    auth.setKey(`hasProfile`, `1`);
    auth.setKey(`unlockedProfile`, `1`);
    auth.setKey(`consent`, `1`);
    newProfile.set(true);
    success.set(true);
    loading.set(false);
    return true;
  } catch (e: any) {
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
    auth.setKey(`hasProfile`, undefined);
    return false;
  }
}

export const ProfileCreate = () => {
  const [submitted, setSubmitted] = useState<boolean | undefined>(undefined);
  const [email, setEmail] = useState(``);
  const [firstname, setFirstname] = useState(``);
  const [bio, setBio] = useState(``);
  const [codeword, setCodeword] = useState(``);
  const [badSave, setBadSave] = useState(false);
  const [personaSelected, setPersonaSelected] = useState(contactPersona[0]);
  const $profile = useStore(profile);

  // Create collection for Ark UI Select
  const personaCollection = useMemo(() => {
    return createListCollection({
      items: contactPersona,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, []);

  const Icon =
    personaSelected.title === `DMs open`
      ? ChatBubbleBottomCenterIcon
      : personaSelected.title === `Major Updates Only`
        ? ArrowPathRoundedSquareIcon
        : personaSelected.title === `All Updates`
          ? BoltIcon
          : BellSlashIcon;
  const iconClass =
    personaSelected.title === `DMs open`
      ? `text-black`
      : personaSelected.title === `Major Updates Only`
        ? `text-mydarkgrey`
        : personaSelected.title === `All Updates`
          ? `text-myorange`
          : `text-mydarkgrey`;
  const barClass =
    personaSelected.title === `DMs open`
      ? `bg-mygreen/80`
      : personaSelected.title === `All Updates`
        ? `bg-myorange/80`
        : personaSelected.title === `Major Updates Only`
          ? `bg-myorange/50`
          : `bg-mydarkgrey/5`;
  const barWidth =
    personaSelected.title === `DMs open`
      ? `100%`
      : personaSelected.title === `All Updates`
        ? `100%`
        : personaSelected.title === `Major Updates Only`
          ? `50%`
          : `2%`;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (firstname && codeword && email && personaSelected.id) {
      const payload = {
        firstname,
        email,
        codeword,
        bio,
        persona: personaSelected.id,
        init: true,
      };
      goSaveProfile(payload).then((res: any) => {
        if (!res) {
          setFirstname(``);
          setEmail(``);
          setBio(``);
          setCodeword(``);
          setPersonaSelected(contactPersona[0]);
          setBadSave(true);
        }
      });
    }
  };

  const handlePersonaChange = (details: { value: string[] }) => {
    const selectedId = details.value[0];
    if (selectedId) {
      const selected = contactPersona.find((item) => item.id === selectedId);
      if (selected) {
        setPersonaSelected(selected);
      }
    }
  };

  useEffect(() => {
    if (badSave) {
      setTimeout(() => setBadSave(false), 7000);
    }
  }, [badSave]);

  // CSS to properly style the select items with hover and selection
  const selectItemStyles = `
    .persona-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .persona-item[data-highlighted] .persona-indicator {
      color: white;
    }
    .persona-item[data-state="checked"] .persona-indicator {
      display: flex;
    }
    .persona-item .persona-indicator {
      display: none;
    }
    .persona-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <>
      <style>{selectItemStyles}</style>
      <h3 className="font-action text-xl py-6 text-myblue">Feel free to introduce yourself</h3>
      <p className="text-md pb-6">
        Already connected?
        <button
          className="text-myblue hover:text-black underline ml-3"
          onClick={() => auth.setKey(`hasProfile`, `1`)}
        >
          Unlock your profile
        </button>
        .
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4">
          {!personaSelected?.disabled ? (
            <>
              <div className="col-span-3 md:col-span-1 pt-6 px-4">
                <label htmlFor="firstname" className="block text-sm text-mydarkgrey">
                  First name
                </label>
                <input
                  type="text"
                  name="firstname"
                  id="firstname"
                  autoComplete="given-name"
                  defaultValue={$profile.firstname || ``}
                  onChange={(e) => setFirstname(e.target.value)}
                  className={classNames(
                    `text-md bg-white p-3 mt-2 block w-full rounded-md shadow-sm focus:border-cyan-600 focus:ring-cyan-600`,
                    submitted && firstname === `` ? `border-red-500` : `border-mydarkgrey`
                  )}
                />
                {submitted && firstname === `` && (
                  <span className="text-xs px-4 text-red-500">Required field.</span>
                )}
              </div>

              <div className="col-span-3 md:col-span-2 pt-6 px-4">
                <label htmlFor="email" className="block text-sm text-mydarkgrey">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={classNames(
                    `text-md bg-white p-3 mt-2 block w-full rounded-md shadow-sm focus:border-cyan-600 focus:ring-cyan-600`,
                    submitted && email === `` ? `border-red-500` : `border-mydarkgrey`
                  )}
                />
                {submitted && email === `` && (
                  <span className="text-xs px-4 text-red-500">Required field.</span>
                )}
              </div>
            </>
          ) : null}

          <div className="col-span-3 pt-6 px-4">
            <div className="flex items-center text-sm">
              <div className="pr-8 text-sm text-black">
                <Select.Root
                  collection={personaCollection}
                  defaultValue={[personaSelected.id]}
                  onValueChange={handlePersonaChange}
                >
                  <Select.Label className="block text-sm text-mydarkgrey mb-2">
                    Choose your level of consent:
                  </Select.Label>

                  <Select.Control className="relative mt-2">
                    <Select.Trigger className="text-md relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-black shadow-sm ring-1 ring-inset ring-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600 leading-6">
                      <Select.ValueText className="block truncate p-2">
                        {personaSelected.title}
                      </Select.ValueText>
                      <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>

                  <Portal>
                    <Select.Positioner>
                      <Select.Content className="z-10 mt-2 w-full overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {personaCollection.items.map((option) => (
                          <Select.Item
                            key={option.id}
                            item={option}
                            className="persona-item cursor-default select-none p-2 text-sm text-black hover:bg-slate-100"
                          >
                            <Select.ItemText className="block truncate">
                              {option.title}
                            </Select.ItemText>
                            <Select.ItemIndicator className="persona-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                              {/* CheckIcon would go here if needed */}
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </div>
              <div className="flex flex-1 items-center">
                <div aria-hidden="true" className="ml-1 flex flex-1 items-center">
                  <Icon
                    className={classNames(iconClass, `flex-shrink-0 h-5 w-5`)}
                    aria-hidden="true"
                  />
                  <div className="relative ml-3 flex-1">
                    <div className="h-7 rounded-full border border-mydarkgrey/20" />
                    <div
                      className={classNames(
                        `absolute inset-y-0 rounded-full border-mydarkgrey/20`,
                        barClass
                      )}
                      style={{ width: barWidth }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-right text-mydarkgrey">{personaSelected.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {firstname && !personaSelected?.disabled ? (
            <>
              <div className="col-span-3 pt-6 px-4">
                <label htmlFor="bio" className="block text-sm text-mydarkgrey">
                  {firstname ? (
                    <>Hello {firstname}. Is there anything else you would like to share?</>
                  ) : (
                    <>
                      Would you like to share anything else? (Contact preferences; company bio;
                      phone number)
                    </>
                  )}
                </label>
                <div className="mt-2">
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    maxLength={280}
                    className="text-md bg-white p-3 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-cyan-600 focus:ring-cyan-600"
                    placeholder="Your one-liner bio"
                    defaultValue={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-1 pt-6 px-4">
                <label htmlFor="codeword" className="block text-sm text-mydarkgrey">
                  Enter your secret code word to protect your account:
                </label>
                <input
                  type="password"
                  name="codeword"
                  id="codeword"
                  autoComplete="off"
                  defaultValue={codeword}
                  onChange={(e) => setCodeword(e.target.value)}
                  className={classNames(
                    `text-md bg-white p-3 mt-2 block w-full rounded-md shadow-sm focus:border-cyan-600 focus:ring-cyan-600`,
                    submitted && codeword === `` ? `border-red-500` : `border-mydarkgrey`
                  )}
                />
                {submitted && codeword === `` && (
                  <span className="text-xs px-4 text-red-500">Required field.</span>
                )}
              </div>
            </>
          ) : (
            <></>
          )}

          {badSave ? (
            <div className="col-span-3 flex justify-center align-center py-12 font-action text-red-500">
              Profile could not be saved. Email already registered.
            </div>
          ) : null}

          <div className="col-span-3 flex justify-center align-center py-12">
            {!personaSelected?.disabled && !badSave ? (
              <button
                type="submit"
                className="inline-flex rounded-md bg-cyan-600/10 hover:bg-black hover:text-white px-3.5 py-1.5 text-base leading-7 text-black shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
              >
                <span className="pr-4">Save Profile</span>
                <ChevronRightIcon className="h-5 w-5 mr-3" aria-hidden="true" />
              </button>
            ) : !badSave ? (
              `Profile disabled. (Privacy mode enabled)`
            ) : null}
          </div>
        </div>
      </form>
    </>
  );
};
