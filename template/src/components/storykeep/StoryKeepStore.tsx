import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { ulid } from "ulid";
import {
  storyFragmentInit,
  storyFragmentTitle,
  storyFragmentSlug,
  storyFragmentTractStackId,
  storyFragmentMenuId,
  storyFragmentPaneIds,
  storyFragmentSocialImagePath,
  storyFragmentTailwindBgColour,
  paneInit,
  paneTitle,
  paneSlug,
  paneMarkdownFragmentId,
  paneIsContextPane,
  paneHeightOffsetDesktop,
  paneHeightOffsetMobile,
  paneHeightOffsetTablet,
  paneHeightRatioDesktop,
  paneHeightRatioMobile,
  paneHeightRatioTablet,
  paneFragmentIds,
  paneFragmentMarkdown,
  paneFragmentBgPane,
  paneFragmentBgColour,
  paneIsHiddenPane,
  paneHasOverflowHidden,
  paneHasMaxHScreen,
  paneFiles,
  paneCodeHook,
  paneImpression,
  paneHeldBeliefs,
  paneWithheldBeliefs,
  unsavedChangesStore,
  uncleanDataStore,
  temporaryErrorsStore,
  creationStateStore,
} from "../../store/storykeep";
import { createFieldWithHistory } from "../../utils/storykeep";
import type {
  StoreKey,
  StoryFragmentDatum,
  PaneDatum,
  BgPaneDatum,
  BgColourDatum,
  MarkdownPaneDatum,
  BeliefDatum,
} from "../../types";

export const StoryKeepStore = (props: { storyfragment: StoryFragmentDatum }) => {
  const { storyfragment } = props;
  const $creationState = useStore(creationStateStore);

  useEffect(() => {
    const populateStores = (fragment: StoryFragmentDatum | undefined) => {
      if (fragment) {
        if (!storyFragmentInit.get()[fragment.id]?.init) {
          // Initialize StoryFragment stores
          const storyFragmentStores = [
            { store: storyFragmentTitle, value: fragment.title },
            { store: storyFragmentSlug, value: fragment.slug },
            { store: storyFragmentTractStackId, value: fragment.tractStackId },
            { store: storyFragmentMenuId, value: fragment.menuId || `` },
            {
              store: storyFragmentPaneIds,
              value: fragment.panesPayload.map((payload: PaneDatum) => payload.id),
            },
            {
              store: storyFragmentSocialImagePath,
              value: fragment.socialImagePath || ``,
            },
            {
              store: storyFragmentTailwindBgColour,
              value: fragment.tailwindBgColour || ``,
            },
          ];

          storyFragmentStores.forEach(({ store, value }) => {
            store.set({
              ...store.get(),
              /* eslint-disable @typescript-eslint/no-explicit-any */
              [fragment.id]: createFieldWithHistory(value as any),
              /* eslint-disable @typescript-eslint/no-explicit-any */
            } as any);
          });

          // Initialize unsavedChanges, uncleanData, and temporaryErrors for StoryFragment
          const storyFragmentKeys: StoreKey[] = [
            "storyFragmentTitle",
            "storyFragmentSlug",
            "storyFragmentTractStackId",
            "storyFragmentMenuId",
            "storyFragmentPaneIds",
            "storyFragmentSocialImagePath",
            "storyFragmentTailwindBgColour",
          ];
          const emptyStoryFragment = storyFragmentKeys.reduce(
            (acc, key) => ({ ...acc, [key]: false }),
            {} as Record<StoreKey, boolean>
          );

          unsavedChangesStore.setKey(fragment.id, emptyStoryFragment);
          uncleanDataStore.setKey(fragment.id, emptyStoryFragment);
          temporaryErrorsStore.setKey(fragment.id, emptyStoryFragment);

          // Process Panes
          fragment.panesPayload.forEach((payload: PaneDatum) => {
            if (!paneInit.get()[payload.id]?.init) {
              // Initialize Pane stores
              const paneStores = [
                { store: paneTitle, value: payload.title },
                { store: paneSlug, value: payload.slug },
                { store: paneIsContextPane, value: payload.isContextPane },
                {
                  store: paneHeightOffsetDesktop,
                  value: payload.heightOffsetDesktop,
                },
                {
                  store: paneHeightOffsetMobile,
                  value: payload.heightOffsetTablet,
                },
                {
                  store: paneHeightOffsetTablet,
                  value: payload.heightOffsetMobile,
                },
                {
                  store: paneHeightRatioDesktop,
                  value: payload.heightRatioDesktop,
                },
                {
                  store: paneHeightRatioMobile,
                  value: payload.heightRatioTablet,
                },
                {
                  store: paneHeightRatioTablet,
                  value: payload.heightRatioMobile,
                },
                {
                  store: paneIsHiddenPane,
                  value: payload.optionsPayload.hiddenPane || false,
                },
                {
                  store: paneHasOverflowHidden,
                  value: payload.optionsPayload.overflowHidden || false,
                },
                {
                  store: paneHasMaxHScreen,
                  value: payload.optionsPayload.maxHScreen || false,
                },
              ];

              paneStores.forEach(({ store, value }) => {
                store.set({
                  ...store.get(),
                  /* eslint-disable @typescript-eslint/no-explicit-any */
                  [payload.id]: createFieldWithHistory(value as any),
                  /* eslint-disable @typescript-eslint/no-explicit-any */
                } as any);
              });

              // Initialize optional Pane stores
              paneCodeHook.set({
                ...paneCodeHook.get(),
                [payload.id]: createFieldWithHistory(payload?.optionsPayload?.codeHook || null),
              });

              paneImpression.set({
                ...paneImpression.get(),
                [payload.id]: createFieldWithHistory(
                  payload?.optionsPayload?.impressions?.at(0) || null
                ),
              });

              paneHeldBeliefs.set({
                ...paneHeldBeliefs.get(),
                [payload.id]: createFieldWithHistory(
                  payload.optionsPayload.heldBeliefs || ({} as BeliefDatum)
                ),
              });

              paneWithheldBeliefs.set({
                ...paneWithheldBeliefs.get(),
                [payload.id]: createFieldWithHistory(
                  payload.optionsPayload.withheldBeliefs || ({} as BeliefDatum)
                ),
              });
              paneFiles.set({
                ...paneFiles.get(),
                [payload.id]: createFieldWithHistory(payload.files || []),
              });

              // Process PaneFragments
              const thisPaneFragmentIds =
                payload.optionsPayload?.paneFragmentsPayload?.map(
                  (paneFragment: BgPaneDatum | BgColourDatum | MarkdownPaneDatum) => {
                    const paneFragmentId = ulid();
                    switch (paneFragment.type) {
                      case `bgColour`:
                        paneFragmentBgColour.set({
                          ...paneFragmentBgColour.get(),
                          [paneFragmentId]: createFieldWithHistory(paneFragment),
                        });
                        break;
                      case `bgPane`:
                        paneFragmentBgPane.set({
                          ...paneFragmentBgPane.get(),
                          [paneFragmentId]: createFieldWithHistory(paneFragment),
                        });
                        break;
                      case `markdown`:
                        if (payload.markdown) {
                          paneFragmentMarkdown.set({
                            ...paneFragmentMarkdown.get(),
                            [paneFragmentId]: createFieldWithHistory({
                              markdown: payload.markdown,
                              payload: paneFragment,
                              type: `markdown`,
                            }),
                          });
                          paneMarkdownFragmentId.set({
                            ...paneMarkdownFragmentId.get(),
                            [payload.id]: createFieldWithHistory(paneFragmentId),
                          });
                        }
                        break;
                      default:
                        console.log(`ERROR: Unknown paneFragment ${JSON.stringify(paneFragment)}`);
                    }
                    // this needs to be done differently...
                    //const paneFragmentKeys: StoreKey[] = [
                    //  "paneFragmentBgColour",
                    //  "paneFragmentBgPane",
                    //  "paneFragmentMarkdown",
                    //];
                    //const emptyPaneFragment = paneFragmentKeys.reduce(
                    //  (acc, key) => ({ ...acc, [key]: false }),
                    //  {} as Record<StoreKey, boolean>
                    //);
                    //unsavedChangesStore.setKey(paneFragmentId, emptyPaneFragment);
                    //uncleanDataStore.setKey(paneFragmentId, emptyPaneFragment);
                    //temporaryErrorsStore.setKey(
                    //  paneFragmentId,
                    //  emptyPaneFragment
                    //);
                    return paneFragmentId;
                  }
                ) || [];

              paneFragmentIds.set({
                ...paneFragmentIds.get(),
                [payload.id]: createFieldWithHistory(thisPaneFragmentIds),
              });

              // Initialize unsavedChanges, uncleanData, and temporaryErrors for Pane
              const paneKeys: StoreKey[] = [
                "paneTitle",
                "paneSlug",
                "paneIsContextPane",
                "paneIsHiddenPane",
                "paneHasOverflowHidden",
                "paneHasMaxHScreen",
                "paneHeightOffsetDesktop",
                "paneHeightOffsetTablet",
                "paneHeightOffsetMobile",
                "paneHeightRatioDesktop",
                "paneHeightRatioTablet",
                "paneHeightRatioMobile",
                "paneFiles",
                "paneCodeHook",
                "paneImpression",
                "paneHeldBeliefs",
                "paneWithheldBeliefs",
              ];
              const emptyPane = paneKeys.reduce(
                (acc, key) => ({ ...acc, [key]: false }),
                {} as Record<StoreKey, boolean>
              );

              unsavedChangesStore.setKey(payload.id, emptyPane);
              uncleanDataStore.setKey(payload.id, emptyPane);
              temporaryErrorsStore.setKey(payload.id, emptyPane);

              paneInit.set({
                ...paneInit.get(),
                [payload.id]: { init: true },
              });
            }
          });
          storyFragmentInit.set({
            ...storyFragmentInit.get(),
            [fragment.id]: { init: true },
          });
        } else if ($creationState.isInitialized) {
          console.log("Creation mode detected, stores already initialized");
        }
      }
    };

    populateStores(storyfragment);
  }, [storyfragment, $creationState]);

  return null;
};
