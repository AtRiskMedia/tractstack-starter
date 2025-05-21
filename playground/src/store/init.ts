import { atom } from "nanostores";
import type { InitWizardStore, InitStep, ValidationResult } from "../types";

export const initWizardStore = atom<InitWizardStore>({
  currentStep: "setup",
  completedSteps: [],
  validation: null,
});

export function setCurrentStep(step: InitStep) {
  const current = initWizardStore.get();
  initWizardStore.set({
    ...current,
    currentStep: step,
  });
}

export function uncompleteStep(step: InitStep) {
  const current = initWizardStore.get();
  if (current.completedSteps.includes(step)) {
    initWizardStore.set({
      ...current,
      completedSteps: current.completedSteps.filter((s) => s !== step),
    });
  }
}

export function completeStep(step: InitStep) {
  const current = initWizardStore.get();
  if (!current.completedSteps.includes(step)) {
    initWizardStore.set({
      ...current,
      completedSteps: [...current.completedSteps, step],
    });
  }
}

export function updateValidation(validation: ValidationResult) {
  const current = initWizardStore.get();
  initWizardStore.set({
    ...current,
    validation,
  });
}

export const quickSetup = atom<boolean>(false);
export function toggleQuickSetup(value: boolean) {
  quickSetup.set(value);
}
