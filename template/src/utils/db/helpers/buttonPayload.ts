import { lispLexer } from "../../concierge/lispLexer";
import { preParseAction } from "../../concierge/preParse_Action";
import { preParseBunny } from "../../concierge/preParse_Bunny";
import { getConfig } from "../../core/config";
import { convertToString } from "../../common/helpers";
import type { ButtonData, FlatNode, ClassNamesPayloadDatumValue } from "../../../types";

const config = await getConfig();

function convertClassesToStringArray(
  classes: ClassNamesPayloadDatumValue
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [key, tuple] of Object.entries(classes)) {
    if (Array.isArray(tuple)) {
      // Convert each tuple value to string and filter out undefined/null
      result[key] = tuple
        .map((value) => (value !== undefined && value !== null ? convertToString(value) : null))
        .filter((value): value is string => value !== null);
    }
  }

  return result;
}

export function processButtonPayload(
  node: Partial<FlatNode>,
  buttonPayload: ButtonData,
  slug: string,
  isContext: boolean
): Partial<FlatNode> {
  if (!buttonPayload || !config) return node;
  const callbackPayload =
    buttonPayload?.callbackPayload && lispLexer(buttonPayload?.callbackPayload);
  const targetUrl = callbackPayload && preParseAction(callbackPayload, slug, isContext, config);
  const bunnyPayload = callbackPayload && preParseBunny(callbackPayload);
  const isExternalUrl =
    (typeof targetUrl === "string" && targetUrl.substring(0, 8) === "https://") ||
    (typeof node.href === "string" && node.href.substring(0, 8) === "https://");
  const buttonClasses = buttonPayload.classNamesPayload?.button?.classes
    ? convertClassesToStringArray(buttonPayload.classNamesPayload.button.classes)
    : {};
  const buttonHoverClasses = buttonPayload.classNamesPayload?.hover?.classes
    ? convertClassesToStringArray(buttonPayload.classNamesPayload.hover.classes)
    : {};

  return {
    ...node,
    href: isExternalUrl ? targetUrl : targetUrl || `#`,
    elementCss: buttonPayload.className,
    tagName: !targetUrl ? `button` : `a`,
    buttonPayload: {
      ...(isExternalUrl ? { isExternalUrl: true } : {}),
      buttonClasses,
      buttonHoverClasses,
      callbackPayload: buttonPayload.callbackPayload,
      ...(bunnyPayload
        ? {
            bunnyPayload,
          }
        : {}),
    },
  };
}
