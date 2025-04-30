/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIContext as AstroAPIContext } from "astro";
import { toolAddModes } from "./constants";
import type { ParagraphsResponse, SentencesResponse, Transcript } from "assemblyai";
import { NodesContext } from "@/store/nodes";
import type { WordSelection } from "@/store/transcribe/appState.ts";

export interface ClassNamesPayloadValue {
  [key: string]: string | string[];
}

export type TupleValue = string | number | boolean;
export type Tuple = [TupleValue] | [TupleValue, TupleValue] | [TupleValue, TupleValue, TupleValue];

export interface CodeHookPayload {
  target: string;
  params: {
    url?: string;
    options?: string;
    height?: string;
    width?: string;
  };
}

export interface ResourceDatum {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  actionLisp: string;
  oneliner: string;
  optionsPayload: any;
}

export interface ImpressionDatum {
  id: string;
  title: string;
  body: string;
  buttonText: string;
  actionsLisp: string;
  parentId: string;
}

export interface BeliefDatum {
  [key: string]: string | string[];
}

export type Theme = "light" | "light-bw" | "light-bold" | "dark" | "dark-bw" | "dark-bold";
export const themes: Theme[] = ["light", "light-bw", "light-bold", "dark", "dark-bw", "dark-bold"];

export interface MenuLinkDatum extends MenuLink {
  to: string;
  internal: boolean;
}

export interface MenuDatum {
  id: string;
  title: string;
  theme: string;
  optionsPayload: MenuLink[];
}

export interface MenuLink {
  name: string;
  description: string;
  featured: boolean;
  actionLisp: string;
}

export interface SystemCapabilities {
  hasTurso: boolean;
  hasAssemblyAI: boolean;
  hasConcierge: boolean;
  hasPassword: boolean;
}

export interface ConfigFile {
  name: string;
  content: unknown;
}

export interface InitConfig {
  SITE_INIT: boolean;
  HOME_SLUG: string;
  TRACTSTACK_HOME_SLUG: string;
  WORDMARK_MODE: string;
  OPEN_DEMO: boolean;
  BRAND_COLOURS: string;
  SITE_URL: string;
  SLOGAN: string;
  FOOTER: string;
  GTAG: string;
  OGAUTHOR: string;
  OGTITLE: string;
  OGDESC: string;
  SOCIALS: string;
  LOGO: string;
  WORDMARK: string;
  OG: string;
  OGLOGO: string;
  FAVICON: string;
  KEYBOARD_ACCESSIBLE: boolean;
  ADMIN_PASSWORD?: string;
  EDITOR_PASSWORD?: string;
  [key: string]: unknown;
}

export type ArtpacksStore = Record<string, string[]>;

export interface Config {
  init: InitConfig;
  artpacks?: ArtpacksStore;
  tenantId?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  config: Config | null;
  capabilities: SystemCapabilities;
  hasPassword: boolean;
  errors?: string[];
}

export interface AuthStatus {
  isAuthenticated: boolean;
  isOpenDemo: boolean;
  isAdmin: boolean;
}

export interface AuthValidationResult {
  isValid: boolean;
  isOpenDemo: boolean;
  errors?: string[];
}

export type SiteMap = {
  id: string;
  slug: string;
  title: string;
  created: Date;
  changed: Date | null;
  type: `StoryFragment` | `Pane`;
  isContextPane?: boolean;
};

export type ContentMap = {
  id: string;
  slug: string;
  title: string;
  created: Date;
  changed: Date | null;
  type: `StoryFragment` | `Pane` | `TractStack`;
  parentId?: string;
  parentSlug?: string;
  parentTitle?: string;
  panes?: string[];
  isContextPane?: boolean;
};

export type ContentMapBase = {
  id: string;
  title: string;
  slug: string;
  type: "Menu" | "Pane" | "Resource" | "StoryFragment" | "TractStack";
};

export type MenuContentMap = ContentMapBase & {
  type: "Menu";
  theme: string;
};

export type ResourceContentMap = ContentMapBase & {
  type: "Resource";
  categorySlug: string | null;
};

export type PaneContentMap = ContentMapBase & {
  type: "Pane";
  isContext: boolean;
};

export type StoryFragmentContentMap = ContentMapBase & {
  type: "StoryFragment";
  panes?: string[];
  socialImagePath?: string;
  thumbSrc?: string;
  thumbSrcSet?: string;
  description?: string;
  topics?: string[];
  changed?: string | null;
};

export type TractStackContentMap = ContentMapBase & {
  type: "TractStack";
  socialImagePath?: string;
};

export type BeliefContentMap = ContentMapBase & {
  type: "Belief";
  scale: string;
};

export type FullContentMap =
  | MenuContentMap
  | ResourceContentMap
  | PaneContentMap
  | StoryFragmentContentMap
  | TractStackContentMap
  | BeliefContentMap;

export interface ResourceNode extends BaseNode {
  title: string;
  slug: string;
  oneliner: string;
  optionsPayload: any;
  category?: string;
  actionLisp?: string;
}

export interface BeliefNode extends BaseNode {
  title: string;
  slug: string;
  scale: string;
  customValues?: string[];
}

export interface MenuNode extends BaseNode {
  title: string;
  theme: string;
  optionsPayload: MenuLink[];
  nodeType: `Menu`;
}

export const tagNames = {
  button: `button`,
  hover: `button hover`,
  modal: `modal`,
  parent: `pane outer`,
  p: `paragraph`,
  h2: `heading 2`,
  h3: `heading 3`,
  h4: `heading 4`,
  h5: `heading 5`,
  img: `image`,
  li: `list item`,
  ol: `aside text container`,
  ul: `container`,
  code: `widget`,
  yt: `youtube widget`,
  bunny: `bunny video`,
  belief: `belief widget`,
  signup: `email signup widget`,
  toggle: `belief toggle widget`,
  identify: `identify as widget`,
};

export type Tag =
  | "modal"
  | "parent"
  | "p"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "img"
  | "li"
  | "ol"
  | "ul"
  | "signup"
  | "yt"
  | "bunny"
  | "belief"
  | "identify"
  | "toggle"
  | "code";

export type AllTag = Tag | "button" | "hover";

export type PaneAstTargetId = {
  outerIdx: number;
  idx: number | null;
  globalNth: number | null;
  tag:
    | "p"
    | "h2"
    | "h3"
    | "h4"
    | "li"
    | "a"
    | "code"
    | "img"
    | "yt"
    | "signup"
    | "bunny"
    | "belief"
    | "toggle"
    | "identify";
  paneId: string;
  buttonTarget?: string;
  mustConfig?: boolean;
};

export type HistoryEntry<T> = {
  value: T;
  timestamp: number;
};

export type FieldWithHistory<T> = {
  current: T;
  original: T;
  history: HistoryEntry<T>[];
};

interface IndexedItem {
  parentNth: number;
  childNth: number;
}

export interface LinkInfo {
  globalNth: number;
  parentNth: number;
  childNth: number;
}

export interface MarkdownLookup {
  images: { [key: number]: IndexedItem };
  codeItems: { [key: number]: IndexedItem };
  listItems: { [key: number]: IndexedItem };
  links: { [key: number]: IndexedItem };
  imagesLookup: { [parentNth: number]: { [childNth: number]: number } };
  codeItemsLookup: { [parentNth: number]: { [childNth: number]: number } };
  listItemsLookup: { [parentNth: number]: { [childNth: number]: number } };
  linksLookup: { [parentNth: number]: { [childNth: number]: number } };
  linksByTarget: { [target: string]: LinkInfo };
  nthTag: { [key: number]: Tag };
  nthTagLookup: { [key: string]: { [key: number]: { nth: number } } };
}
export interface MarkdownLookupObj {
  [key: string | number]: { nth: number };
}

export type ToolModeVal = "styles" | "text" | "insert" | "eraser" | "move" | "layout" | "debug";
//  | "pane"
//  | "settings"
//  | "layout"
//  | "markdown";
export type ToolAddMode = (typeof toolAddModes)[number];

export type ViewportKey = "mobile" | "tablet" | "desktop" | "auto";
export type ViewportAuto = "mobile" | "tablet" | "desktop";

export type TursoQuery = {
  sql: string;
  args: (string | number | boolean | null)[];
};

export type InitStep = "setup" | "integrations" | "brand" | "security" | "publish" | "createHome";

export interface InitStepConfig {
  id: InitStep;
  title: string;
  description: string;
  isComplete: boolean;
  isLocked: boolean;
}

export interface InitWizardStore {
  currentStep: InitStep;
  completedSteps: InitStep[];
  validation: ValidationResult | null;
}

export interface StepProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

export interface Referrer {
  httpReferrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export type BeliefStore = {
  id: string;
  slug: string;
  verb: string;
  object?: string;
};

export interface Current {
  id: string;
  slug: string;
  title: string;
  isContextPane?: boolean;
}

export interface VisitContext {
  fingerprint_id: string;
  visit_id: string;
}

export type EventStream = {
  id: string;
  type: string;
  verb: string;
  duration?: number;
  object?: string | boolean;
};

export interface EventPayload {
  events: EventStream[];
  referrer?: Referrer;
  visit: VisitContext;
}

export type PieDataItem = {
  id: string;
  value: number;
};

export type LineDataPoint = {
  x: string | number;
  y: number;
};

export type LineDataSeries = {
  id: string;
  data: LineDataPoint[];
};

export type AnalyticsItem = {
  id: number;
  object_id: string;
  object_name: string;
  object_type: "StoryFragment" | "Pane";
  total_actions: number;
  verbs: PieDataItem[] | LineDataSeries[];
};

export type RawAnalytics = {
  pie: AnalyticsItem[];
  line: AnalyticsItem[];
};

export type ProcessedAnalytics = {
  pie: PieDataItem[];
  line: LineDataSeries[];
};

export type Analytics = {
  [key: string]: ProcessedAnalytics;
};

export type DashboardAnalytics = {
  stats: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  line: LineDataSeries[];
  hot_content: HotItem[];
};

export type HotItem = {
  id: string;
  total_events: number;
};

export interface StoryStep {
  id: string;
  slug: string;
  title: string;
  type: string;
}

export type PanesVisible = {
  [key: string]: number | null;
};

export interface StoryKeepFileDatum {
  filename: string;
  altDescription: string;
  b64: string;
}

export interface IsInit {
  [key: string]: { init: boolean };
}

export type EditModeValue = {
  id: string;
  mode: string;
  type: "storyfragment" | "pane" | "context" | "tractstack" | "resource" | "menu" | "file";
  targetId?: PaneAstTargetId;
  payload?: any;
};

export type SettingsPanelSignal = {
  action: string;
  nodeId: string;
  childId?: string;
  layer?: number;
  className?: string;
  minimized?: boolean;
  expanded?: boolean;
};

export interface EventNode {
  type: string;
  slug?: string;
  title?: string;
  parentId?: string;
}
export interface EventNodes {
  [key: string]: EventNode;
}

export interface Event {
  id: string;
  type: string;
  verb: string;
  duration?: number;
  targetId?: string;
  score?: string;
  targetSlug?: string;
}
export interface Events {
  [key: string]: Event;
}

export interface EventStreamController {
  stop: () => void;
}

export interface BreakOptionsDatum {
  id: string;
  artpackMode: string;
  styles: { fill: string };
  shapeName: string;
}

export interface MaskOptionsDatum {
  id: string;
  artpackMode: string;
  classNamesParent: string;
  styles: {
    backgroundImage: string;
    backgroundSize: string;
    WebkitMaskImage: string;
    maskImage: string;
    maskRepeat: string;
    WebkitMaskSize: string;
    maskSize: string;
  };
}

export interface ShapeOptionsDatum {
  id: string;
  shapeName: string;
  classNamesParent: string;
  artpackMode: string | null;
}

export interface BeliefOptionDatum {
  id: number;
  slug: string;
  name: string;
  color: string;
}

export interface SignupProps {
  persona: string;
  prompt: string;
  clarifyConsent: boolean;
}

export interface ContactPersona {
  id: string;
  description: string;
  title: string;
  disabled?: boolean;
}

export interface SyncOptions {
  fingerprint?: string;
  visitId?: string;
  encryptedCode?: string;
  encryptedEmail?: string;
  referrer?: {
    httpReferrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  };
}

//export type ButtonStyleClass = {
//  [key: string]: string[];
//}[];
//
//export type StoreMapType = {
//  [K in StoreKey]?: MapStore<Record<string, FieldWithHistory<any>>>;
//};
//
//export type StoreValueType = {
//  storyFragmentTitle: string;
//  storyFragmentSlug: string;
//  storyFragmentTailwindBgColour: string;
//  storyFragmentSocialImagePath: string;
//  storyFragmentMenuId: string;
//  paneFragmentMarkdown: MarkdownEditDatum;
//  paneTitle: string;
//  paneSlug: string;
//  // Add other store types here
//};

export type ValidationFunction = (value: string) => boolean;

export interface ResourceSetting {
  [key: string]: {
    type: "string" | "boolean" | "number" | "date";
    defaultValue?: any;
  };
}

//
// Transcribe
//

export interface TranscriptionEntry {
  uuid: string;
  title: string;
  state: ProcessState;
}

export type StoryChapterOverrides = {
  gist: string;
};

export interface StoryData {
  transcriptId: string;
  uuid: string;
  title: string;
  status: StoryStatus;
  chaptersOverrides: Map<number, StoryChapterOverrides>;
  wordsSelection: Record<number, WordSelection[]>;
}

export type TranscriptServerResponse = {
  transcript: Transcript;
  sentences: SentencesResponse;
  paragraphs: ParagraphsResponse;
};

export enum ProcessState {
  NONE = -1,
  QUEUED = 0,
  PROCESSING = 1,
  COMPLETED = 2,
  ERROR = 3,
}

export const getProcessState = (
  status: "queued" | "processing" | "completed" | "error"
): ProcessState => {
  switch (status) {
    case "completed":
      return ProcessState.COMPLETED;
    case "error":
      return ProcessState.ERROR;
    case "processing":
      return ProcessState.PROCESSING;
    case "queued":
      return ProcessState.QUEUED;
    default:
      return ProcessState.NONE;
  }
};

export enum ActiveView {
  CHAPTERS = 0,
  PDF_MODE = 1,
}

export enum TextSelectionType {
  NONE = "none",
  HEADLINE = "headline",
  KEY_POINT = "key_point",
  ANECDOTE = "anecdote",
}

export enum TextSelectionOperation {
  NONE = -1,
  ADD = 0,
  REMOVE = 1,
  EDIT = 2,
}

export enum SelectedWordType {
  NOT_SELECTED = 0,
  FIRST_WORD = 1,
  MIDDLE = 2,
  LAST_WORD = 3,
}

export enum StoryStatus {
  None = -1,
  Draft = 0,
  Published = 1,
}

export interface TractStackNode extends BaseNode {
  title: string;
  slug: string;
  socialImagePath?: string;
}

export type NodeType =
  | "Root"
  | "Pane"
  | "StoryFragment"
  | "BgPane"
  | "Markdown"
  | "TagElement"
  | "TractStack"
  | "Menu"
  | "Impression"
  | "File"
  | "Belief"
  | "Resource";

export interface BaseNode {
  id: string;
  parentId: string | null;
  nodeType: NodeType;
  isChanged?: boolean;
}

export interface ImageFileNode extends BaseNode {
  filename: string;
  altDescription: string;
  src: string;
  nodeType: `File`;
  srcSet?: string;
}

export interface PaneNode extends BaseNode {
  title: string;
  slug: string;
  isDecorative: boolean;
  created?: Date;
  changed?: Date;
  bgColour?: string;
  isContextPane?: boolean;
  heightOffsetDesktop?: number;
  heightOffsetMobile?: number;
  heightOffsetTablet?: number;
  heightRatioDesktop?: string;
  heightRatioMobile?: string;
  heightRatioTablet?: string;
  codeHookTarget?: string;
  codeHookPayload?: {
    [key: string]: string;
  };
  heldBeliefs?: BeliefDatum;
  withheldBeliefs?: BeliefDatum;
}

export interface StoryFragmentNode extends BaseNode {
  title: string;
  slug: string;
  hasMenu: boolean;
  paneIds: string[];
  menuId?: string;
  tailwindBgColour?: string;
  socialImagePath?: string | null;
  created?: Date;
  changed?: Date;
  impressions?: ImpressionNode[];
}

export interface VisualBreakData {
  collection: string;
  image: string;
  svgFill: string;
}

//export interface MarkdownNode extends PaneFragmentNode {
//  type: "markdown";
//  // Add your markdown-specific fields here
//}

export interface BgImageNode extends PaneFragmentNode {
  type: "background-image";
  fileId: string;
  src: string;
  srcSet?: string;
  alt?: string;
  objectFit: "cover" | "contain" | "fill";
}
export interface ArtpackImageNode extends PaneFragmentNode {
  type: "artpack-image";
  collection: string;
  image: string;
  src: string;
  srcSet?: string;
  alt?: string;
  objectFit: "cover" | "contain" | "fill";
}

export interface VisualBreakNode extends PaneFragmentNode {
  type: "visual-break";
  breakDesktop?: VisualBreakData;
  breakTablet?: VisualBreakData;
  breakMobile?: VisualBreakData;
  hiddenViewportDesktop?: boolean;
  hiddenViewportTablet?: boolean;
  hiddenViewportMobile?: boolean;
}

//export interface StoryKeepNodes {
//  tractstackNode: TractStackNode;
//  storyfragmentNode: StoryFragmentNode;
//  paneNodes: PaneNode[];
//  paneFragmentNodes: PaneFragmentNode[];
//  flatNodes: FlatNode[];
//  fileNodes: ImageFileNode[];
//  //menuNodes: MenuNode[];
//}

export interface StoryKeepAllNodes {
  tractstackNodes: TractStackNode[];
  storyfragmentNodes: StoryFragmentNode[];
  paneNodes: PaneNode[];
  paneFragmentNodes: PaneFragmentNode[];
  flatNodes: FlatNode[];
  fileNodes: ImageFileNode[];
  menuNodes: MenuNode[];
  impressionNodes: ImpressionNode[];
  resourceNodes: ResourceNode[];
}

export interface FlattenedClasses {
  [key: string]: string;
}

export type TemplateNode = FlatNode & {
  id?: string;
  parentId?: string;
  tagName?: string;
  nodes?: TemplateNode[];
};

export type TemplateMarkdown = MarkdownPaneFragmentNode & {
  nodes?: TemplateNode[];
  markdownBody?: string;
};

export interface VisualBreakNode extends PaneFragmentNode {
  type: "visual-break";
  breakDesktop?: VisualBreakData;
  breakTablet?: VisualBreakData;
  breakMobile?: VisualBreakData;
  hiddenViewportDesktop?: boolean;
  hiddenViewportTablet?: boolean;
  hiddenViewportMobile?: boolean;
}

export type TemplatePane = PaneNode & {
  id?: string;
  parentId?: string;
  markdown?: TemplateMarkdown;
  bgPane?: VisualBreakNode | ArtpackImageNode;
};

export interface FlatNode extends BaseNode {
  tagName: string;
  tagNameCustom?: string;
  copy?: string;
  src?: string;
  srcSet?: string;
  alt?: string;
  href?: string;
  text?: string;
  fileId?: string;
  codeHookParams?: (string | string[])[];
  overrideClasses?: {
    mobile?: Record<string, string>;
    tablet?: Record<string, string>;
    desktop?: Record<string, string>;
  };
  elementCss?: string;
  buttonPayload?: {
    buttonClasses: Record<string, string[]>;
    buttonHoverClasses: Record<string, string[]>;
    callbackPayload: string;
    isExternalUrl?: boolean;
    bunnyPayload?: {
      t: string;
      videoId: string | null;
      slug?: string;
      isContext?: boolean;
    };
  };
}

export interface MdxNode {
  type: string;
  tagName?: string;
  properties?: Record<string, any>;
  children?: MdxNode[];
  value?: string;
  position?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
}

export type StyleValue = string[];

export type StylesInput = {
  [key: string]: (StyleValue | null)[];
};

export interface PaneFragmentNode extends BaseNode {
  type: "markdown" | "visual-break" | "background-image" | "artpack-image";
  hiddenViewportMobile?: boolean;
  hiddenViewportTablet?: boolean;
  hiddenViewportDesktop?: boolean;
}

export type ParentClassesPayload = Array<{
  mobile: Record<string, string>;
  tablet: Record<string, string>;
  desktop: Record<string, string>;
}>;

export interface MarkdownPaneFragmentNode extends PaneFragmentNode {
  type: "markdown";
  markdownId: string;
  defaultClasses?: Record<
    string,
    {
      mobile: Record<string, string>;
      tablet: Record<string, string>;
      desktop: Record<string, string>;
    }
  >;
  parentClasses?: ParentClassesPayload;
  parentCss?: string[];
}

export interface ImpressionNode extends BaseNode {
  nodeType: "Impression";
  tagName: "impression";
  title: string;
  body: string;
  buttonText: string;
  actionsLisp: string;
}

export interface LinkNode extends FlatNode {
  tagName: "a" | "button";
  buttonPayload?: {
    buttonClasses: Record<string, string[]>;
    buttonHoverClasses: Record<string, string[]>;
    callbackPayload: string;
    isExternalUrl?: boolean;
    bunnyPayload?: {
      t: string;
      videoId: string | null;
      slug?: string;
      isContext?: boolean;
    };
  };
}

interface BaseTarget {
  name: string;
  description: string;
}

interface SimpleTarget extends BaseTarget {
  subcommands?: never;
  requiresParam?: never;
  paramLabel?: never;
  requiresSecondParam?: never;
  param2Label?: never;
  placeholder?: never;
}

interface SubcommandTarget extends BaseTarget {
  subcommands: string[];
  requiresParam?: never;
  paramLabel?: never;
  requiresSecondParam?: never;
  param2Label?: never;
  placeholder?: never;
}

interface SingleParamTarget extends BaseTarget {
  subcommands?: never;
  requiresParam: true;
  paramLabel: string;
  requiresSecondParam?: never;
  param2Label?: never;
  requiresThirdParam?: never;
  param3Label?: never;
  placeholder?: string;
}

interface DoubleParamTarget extends BaseTarget {
  subcommands?: never;
  requiresParam: true;
  paramLabel: string;
  requiresSecondParam: true;
  param2Label: string;
  requiresThirdParam?: boolean;
  param3Label?: string;
  placeholder?: never;
}

interface TripleParamTarget extends BaseTarget {
  subcommands?: never;
  requiresParam: true;
  paramLabel: string;
  requiresSecondParam: true;
  param2Label: string;
  requiresThirdParam: true;
  param3Label: string;
  placeholder?: never;
}

type TargetConfig =
  | SimpleTarget
  | SubcommandTarget
  | SingleParamTarget
  | DoubleParamTarget
  | TripleParamTarget;

type GotoTargets = {
  [key: string]: TargetConfig;
};

export type {
  BaseTarget,
  SimpleTarget,
  SubcommandTarget,
  SingleParamTarget,
  DoubleParamTarget,
  TargetConfig,
  GotoTargets,
};

export enum ContextPaneMode {
  DEFAULT = "DEFAULT",
  TITLE = "TITLE",
  SLUG = "SLUG",
}

export enum PaneAddMode {
  DEFAULT = "DEFAULT",
  NEW = "NEW",
  BREAK = "BREAK",
  REUSE = "REUSE",
  CODEHOOK = "CODEHOOK",
}

export enum PaneConfigMode {
  DEFAULT = "DEFAULT",
  TITLE = "TITLE",
  SLUG = "SLUG",
  PATH = "PATH",
  IMPRESSION = "IMPRESSION",
  CODEHOOK = "CODEHOOK",
}

export enum StoryFragmentMode {
  DEFAULT = "DEFAULT",
  SLUG = "SLUG",
  MENU = "MENU",
  OG = "OG",
}

export interface BunnyPlayer {
  on(event: string, callback: (data: any) => void): void;
  off(event: string): void;
  getCurrentTime(callback: (time: number) => void): void;
  setCurrentTime(time: number): void;
  pause(): void;
  call(method: string, ...args: any[]): void;
}

export interface PlayerJS {
  Player: new (elementId: string) => BunnyPlayer;
}

declare global {
  interface Window {
    playerjs: PlayerJS;
  }
}

// Export a type guard for checking playerjs existence
export function hasPlayerJS(window: Window): window is Window & { playerjs: PlayerJS } {
  return "playerjs" in window;
}

export type PageDesign = {
  id: string;
  title: string;
  introDesign: any; // Will be TemplatePane
  contentDesign: any; // Will be TemplatePane
  visualBreaks?: {
    odd: any; // Will be TemplatePane
    even: any; // Will be TemplatePane
  };
};

export interface LeadMetrics {
  total_visits: number;
  total_leads: number;
  last_activity: string;
  first_time_24h: number;
  returning_24h: number;
  first_time_7d: number;
  returning_7d: number;
  first_time_28d: number;
  returning_28d: number;
  first_time_24h_percentage: number;
  returning_24h_percentage: number;
  first_time_7d_percentage: number;
  returning_7d_percentage: number;
  first_time_28d_percentage: number;
  returning_28d_percentage: number;
}

export interface StoryfragmentAnalytics {
  id: string;
  slug: string;
  total_actions: number;
  unique_visitors: number;
  last_24h_actions: number;
  last_7d_actions: number;
  last_28d_actions: number;
  last_24h_unique_visitors: number;
  last_7d_unique_visitors: number;
  last_28d_unique_visitors: number;
  total_leads: number;
}

export type NodeProps = {
  nodeId: string;
  config?: Config;
  ctx?: NodesContext;
  first?: boolean;
};

export interface TitleResponse {
  success: boolean;
  data: {
    response: {
      title: string;
      slug: string;
    };
  };
}

export interface AppLocals {
  user?: {
    isAuthenticated: boolean;
    isAdmin: boolean;
    isOpenDemo: boolean;
  };
  tenant?: {
    id: string;
    paths: {
      dbPath: string;
      configPath: string;
      publicPath: string;
    };
  };
  config?: Config;
}

export type APIContext = AstroAPIContext & {
  locals: AppLocals;
};

export interface OgImageParams {
  textColor: string;
  bgColor: string;
  fontSize?: number;
}

export interface VideoMoment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  title: string;
  description?: string;
  linkedPaneId?: string;
}

export type TenantStatus = "reserved" | "claimed" | "activated" | "archived";

export interface TenantConfig {
  status: TenantStatus;
  email: string;
  name: string;
  TENANT_SECRET: string;
  createdAt: string;
  lastAccessed: string;
  lastAdminAccess?: string;
  activationToken?: string;
  activationTokenExpires?: string;
}

export interface TenantCreateRequest {
  tenantId: string;
  email: string;
  name: string;
}

export interface TenantOperationResponse {
  success: boolean;
  tenantId?: string;
  message?: string;
  error?: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  tenantId?: string;
  email?: string;
  expired?: boolean;
  message?: string;
}

export interface PanelState {
  paneId: string;
  panel: string;
  mode: string;
}

export interface EpinetStep {
  gateType: "belief" | "identifyAs" | "commitmentAction" | "conversionAction";
  title: string;
  values: string[];
}

export interface EpinetStepBelief extends EpinetStep {
  gateType: "belief";
}

export interface EpinetStepIdentifyAs extends EpinetStep {
  gateType: "identifyAs";
}

export interface EpinetStepCommitmentAction extends EpinetStep {
  gateType: "commitmentAction";
  objectType: "StoryFragment" | "Pane" | "ContextPage";
  objectIds?: string[];
}

export interface EpinetStepConversionAction extends EpinetStep {
  gateType: "conversionAction";
  objectType: "StoryFragment" | "Pane" | "ContextPage";
  objectIds?: string[];
}

export interface EpinetDatum {
  id: string;
  title: string;
  steps: (
    | EpinetStepBelief
    | EpinetStepIdentifyAs
    | EpinetStepCommitmentAction
    | EpinetStepConversionAction
  )[];
}

export interface ComputedEpinetNode {
  name: string;
}

export interface ComputedEpinetLink {
  source: number;
  target: number;
  value: number;
}

export interface ComputedEpinet {
  id: string;
  title: string;
  nodes: ComputedEpinetNode[];
  links: ComputedEpinetLink[];
}

export interface ComputedEpinets {
  daily: ComputedEpinet;
  weekly: ComputedEpinet;
  monthly: ComputedEpinet;
  all?: ComputedEpinet;
}

export interface HourlyAnalyticsData {
  contentData: Record<string, Record<string, HourlyContentData>>;
  siteData: Record<string, HourlySiteData>;
  lastFullHour: string;
  totalLeads: number;
  lastActivity: string | null;
  slugMap: Map<string, string>; // Maps content IDs to slugs
}

export interface HourlyContentData {
  uniqueVisitors: Set<string>; // fingerprint_ids
  knownVisitors: Set<string>; // visitors with lead_id
  anonymousVisitors: Set<string>; // visitors without lead_id
  actions: number;
  eventCounts: Record<string, number>;
}

export interface HourlySiteData {
  totalVisits: number;
  knownVisitors: Set<string>;
  anonymousVisitors: Set<string>;
  eventCounts: Record<string, number>;
}

export interface TimeRangeMetrics {
  anonymousVisitors: Set<string>;
  knownVisitors: Set<string>;
  totalVisitors: number;
  totalVisits: number;
  eventCounts: Record<string, number>;
}
