/* eslint-disable @typescript-eslint/no-explicit-any */
import { toolAddModes } from "./constants";
import type { Root } from "hast";

export interface ClassNamesPayloadValue {
  [key: string]: string | string[];
}

export type TupleValue = string | number | boolean;
export type Tuple = [TupleValue] | [TupleValue, TupleValue] | [TupleValue, TupleValue, TupleValue];

export interface CodeHookDatum {
  target: string;
  url?: string | undefined;
  options?: string | undefined;
  height?: string | undefined;
  width?: string | undefined;
}

export interface ButtonData {
  urlTarget: string;
  callbackPayload: string;
  className: string;
  classNamesPayload: ClassNamesPayload;
  classNameDesktop?: string;
  classNameTablet?: string;
  classNameMobile?: string;
}

export interface ClassNamesPayloadDatumValue {
  [key: string]: Tuple;
}

export interface ClassNamesPayload {
  [key: string]: {
    classes: ClassNamesPayloadDatumValue;
  };
}
export interface ClassNamesPrePayload {
  [key: string]: TupleValue | TupleValue[];
}

export interface ClassNamesPayloadInnerDatum {
  classes: ClassNamesPayloadDatumValue | ClassNamesPayloadDatumValue[];
  count?: number;
  override?: {
    [key: string]: (Tuple | null)[];
  };
}
export interface ClassNamesPayloadDatum {
  [key: string]: ClassNamesPayloadInnerDatum;
}

export interface ClassNamesPayloadResult {
  all: string | string[];
  mobile: string | string[];
  tablet: string | string[];
  desktop: string | string[];
}

export interface OptionsPayloadDatum {
  classNamesPayload: ClassNamesPayloadDatum;
  classNamesParent?: ClassNamesPayloadResult;
  classNamesModal?: ClassNamesPayloadResult;
  classNames?: {
    all: ClassNamesPayloadValue;
    desktop?: ClassNamesPayloadValue;
    tablet?: ClassNamesPayloadValue;
    mobile?: ClassNamesPayloadValue;
  };
  buttons?: {
    [key: string]: ButtonData;
  };
  modal?: {
    [key: string]: {
      zoomFactor: number;
      paddingLeft: number;
      paddingTop: number;
    };
  };
  artpack?: {
    [key: string]: {
      image: string;
      collection: string;
      filetype: string;
      mode: string;
      objectFit: string;
      svgFill?: string;
    };
  };
}

export interface MarkdownEditDatum {
  markdown: MarkdownDatum;
  payload: MarkdownPaneDatum;
  type: `markdown`;
}

export interface MarkdownPaneDatum extends PaneFragmentDatum {
  type: `markdown`;
  imageMaskShapeDesktop?: string;
  imageMaskShapeTablet?: string;
  imageMaskShapeMobile?: string;
  textShapeOutsideDesktop?: string;
  textShapeOutsideTablet?: string;
  textShapeOutsideMobile?: string;
  optionsPayload: OptionsPayloadDatum;
  isModal: boolean;
  //markdownBody: string;
  //markdownId: string;
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

export interface TractStackDatum {
  id: string;
  title: string;
  slug: string;
  socialImagePath: string;
}

export interface ImpressionDatum {
  id: string;
  title: string;
  body: string;
  buttonText: string;
  actionsLisp: string;
  parentId: string;
}

export interface MarkdownDatum {
  body: string;
  id: string;
  slug: string;
  title: string;
  htmlAst: Root;
}

export interface PaneFragmentDatum {
  id: string;
  hiddenViewports: string;
}
export interface BgColourDatum extends PaneFragmentDatum {
  type: `bgColour`;
  bgColour: string;
}
export interface BgPaneDatum extends PaneFragmentDatum {
  type: `bgPane`;
  shape?: string;
  shapeDesktop?: string;
  shapeTablet?: string;
  shapeMobile?: string;
  optionsPayload: OptionsPayloadDatum;
}

export interface BeliefDatum {
  [key: string]: string | string[];
}

export type DesignType = `hero` | `hero-image` | `section` | `copy` | `decorative` | `unknown`;
export interface PaneOptionsPayload {
  paneFragmentsPayload?: (BgPaneDatum | BgColourDatum | MarkdownPaneDatum)[];
  impressions?: ImpressionDatum[];
  codeHook?: CodeHookDatum;
  hiddenPane?: boolean;
  overflowHidden?: boolean;
  maxHScreen?: boolean;
  heldBeliefs?: BeliefDatum;
  withheldBeliefs?: BeliefDatum;
  designType?: DesignType;
}

export interface PaneDesignOptionsPayload extends PaneOptionsPayload {
  bgColour: string | null;
}

export interface PaneDatum {
  id: string;
  title: string;
  slug: string;
  created: Date;
  changed: Date | null;
  markdown: MarkdownDatum | false | null;
  optionsPayload: PaneOptionsPayload;
  isContextPane: boolean;
  heightOffsetDesktop: number;
  heightOffsetMobile: number;
  heightOffsetTablet: number;
  heightRatioDesktop: string;
  heightRatioMobile: string;
  heightRatioTablet: string;
  files: FileDatum[];
}

export interface ResourcePayloadDatum {
  perCodeHookPayload: { [key: number]: CodeHookDatum };
  perCodeHookOptions: { [key: number]: string };
  perCodeHookResourceCategory: { [key: number]: string[] };
  resources: ResourceDatum[];
  headerWidget: ResourceDatum[];
}

export interface StoryFragmentDatum {
  id: string;
  title: string;
  slug: string;
  tractStackId: string;
  tractStackTitle: string;
  tractStackSlug: string;
  created: Date;
  changed: Date | null;
  socialImagePath: string | null;
  tailwindBgColour: string | null;
  hasMenu: boolean;
  menuId: string | null;
  menuPayload: MenuDatum | null;
  panesPayload: PaneDatum[];
  impressions: ImpressionDatum[];
  resourcesPayload: ResourcePayloadDatum;
}

export interface ContextPaneDatum {
  id: string;
  title: string;
  slug: string;
  created: Date;
  changed: Date | null;
  panePayload: PaneDatum | null;
  impressions: ImpressionDatum[];
  resourcesPayload: ResourceDatum[];
  codeHookOptions: { [key: number]: string };
}

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

export interface FileDatum {
  id: string;
  filename: string;
  altDescription: string;
  paneId: string;
  markdown: boolean;
  src: string;
  srcSet: boolean;
  optimizedSrc?: string;
}

export interface PaneDesignMarkdown {
  id?: string;
  type: "markdown";
  markdownBody: string;
  textShapeOutsideDesktop: string;
  textShapeOutsideTablet: string;
  textShapeOutsideMobile: string;
  imageMaskShapeDesktop: string;
  imageMaskShapeTablet: string;
  imageMaskShapeMobile: string;
  isModal: boolean;
  hiddenViewports: string;
  optionsPayload: OptionsPayloadDatum;
}
export interface PaneDesignBgPane {
  type: "bgPane";
  shape?: string;
  shapeMobile: string;
  shapeTablet: string;
  shapeDesktop: string;
  hiddenViewports: string;
  optionsPayload: OptionsPayloadDatum;
}
export interface PaneDesign {
  id: string;
  slug: string;
  name: string;
  designType: DesignType;
  variants: string[];
  priority: number;
  type: `starter` | `break` | `reuse` | `codehook`;
  panePayload: {
    heightOffsetDesktop: number;
    heightOffsetTablet: number;
    heightOffsetMobile: number;
    heightRatioDesktop: string;
    heightRatioTablet: string;
    heightRatioMobile: string;
    bgColour: string | boolean;
    codeHook: string | null;
    hiddenPane?: boolean;
  };
  files: FileDatum[];
  fragments: (PaneDesignBgPane | PaneDesignMarkdown | BgColourDatum)[];
  orientation?: `above` | `below`;
}
export interface PageDesign {
  name: string;
  isContext: boolean;
  tailwindBgColour: string | null;
  paneDesigns: PaneDesign[];
  paneDesignsOdd?: { [key: string]: PaneDesign };
  pageTitle?: string;
}

export interface TursoFileNode {
  id: string;
  filename: string;
  url: string;
  alt_description: string;
  src_set: boolean;
  paneId: string;
  markdown: boolean;
}

export interface DatumPayload {
  files: TursoFileNode[];
  tractstack: TractStackDatum[];
  menus: MenuDatum[];
  resources: ResourceDatum[];
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
  WORDMARK_MODE: string;
  OPEN_DEMO: boolean;
  BRAND_COLOURS: string;
  SITE_URL: string;
  SLOGAN: string;
  FOOTER: string;
  [key: string]: unknown;
}

export interface Config {
  init: InitConfig;
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
};

export type TractStackContentMap = ContentMapBase & {
  type: "TractStack";
};

export type FullContentMap =
  | MenuContentMap
  | ResourceContentMap
  | PaneContentMap
  | StoryFragmentContentMap
  | TractStackContentMap;

export interface TursoPane {
  id: string;
  title: string;
  slug: string;
  created: string;
  changed: string | null;
  markdown_body: string;
  options_payload: string | null;
  is_context_pane: boolean;
  height_offset_desktop: number;
  height_offset_mobile: number;
  height_offset_tablet: number;
  height_ratio_desktop: string;
  height_ratio_mobile: string;
  height_ratio_tablet: string;
  files: TursoFileNode[];
}

export interface FileNode {
  id: string;
  filename: string;
  altDescription: string;
  url?: string;
  src: string;
  srcSet: boolean;
  paneId: string;
  markdown: boolean;
  optimizedSrc?: string;
}

export interface PaneFileNode {
  id: string;
  files: FileNode[];
}

export type GraphRelationshipDatum = {
  from?: number;
  to?: number;
  label: string;
  font: { align: string; size: string };
  arrows: {
    to: {
      enabled: boolean;
      type: string;
    };
  };
};

export type GraphNodeDatum = {
  id: string;
  title: string;
  label: string;
  color: string;
  value?: number;
};

export type GraphNode = {
  id?: string;
  startNodeId?: number;
  endNodeId?: number;
  labels?: string[];
  type?: string;
  properties?: {
    name?: string;
    created_at?: number;
    visit_id?: string;
    object_type?: string;
    object_name?: string;
    object?: string;
    fingerprint_id?: string;
    belief_id?: string;
    pageRank?: number;
  };
};
export interface GraphNodes {
  [key: string]: GraphNode | null;
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
  img: `image`,
  li: `list item`,
  ol: `aside text container`,
  ul: `container`,
  code: `widget`,
};

export type Tag =
  | "modal"
  | "parent"
  | "p"
  | "h2"
  | "h3"
  | "h4"
  | "img"
  | "li"
  | "ol"
  | "ul"
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

export type ToolMode = "insert" | "text" | "styles" | "settings" | "pane" | "eraser";
export type StoreKey =
  | "envSettings"
  | "storyFragmentTitle"
  | "storyFragmentSlug"
  | "storyFragmentTractStackId"
  | "storyFragmentMenuId"
  | "storyFragmentPaneIds"
  | "storyFragmentSocialImagePath"
  | "storyFragmentTailwindBgColour"
  | "paneTitle"
  | "paneSlug"
  | "paneMarkdownBody"
  | "paneIsContextPane"
  | "paneIsHiddenPane"
  | "paneHasOverflowHidden"
  | "paneHasMaxHScreen"
  | "paneHeightOffsetDesktop"
  | "paneHeightOffsetTablet"
  | "paneHeightOffsetMobile"
  | "paneHeightRatioDesktop"
  | "paneHeightRatioTablet"
  | "paneHeightRatioMobile"
  | "paneFiles"
  | "paneCodeHook"
  | "paneImpression"
  | "paneHeldBeliefs"
  | "paneWithheldBeliefs"
  | "paneFragmentIds"
  | "paneFragmentBgColour"
  | "paneFragmentBgPane"
  | "paneFragmentMarkdown";

export type ToolAddMode = (typeof toolAddModes)[number];

export type ViewportKey = "mobile" | "tablet" | "desktop" | "auto";
export type ViewportAuto = "mobile" | "tablet" | "desktop";

export type GeneratedCopy = {
  pageTitle: string;
  paragraphs: string[];
  title?: string;
};

export type Theme = "light" | "light-bw" | "light-bold" | "dark" | "dark-bw" | "dark-bold";

export type Variant =
  | `default`
  | `center`
  | `onecolumn`
  | `square`
  | `16x9`
  | `defaultEmpty`
  | `centerEmpty`
  | `onecolumnEmpty`
  | `squareBordered`
  | `16x9Bordered`;

export type ReconciledData = {
  storyFragment?: {
    data: StoryFragmentDatum;
    queries: StoryFragmentQueries;
  };
  contextPane?: {
    data: ContextPaneDatum;
    queries: ContextPaneQueries;
  };
};

export type StoryFragmentQueries = {
  storyfragment: TursoQuery;
  panes: TursoQuery[];
  markdowns: TursoQuery[];
  storyfragment_pane: TursoQuery[];
  file_pane: TursoQuery[];
  file_markdown: TursoQuery[];
  files: TursoQuery[];
};

export type ContextPaneQueries = {
  pane: TursoQuery;
  markdowns: TursoQuery[];
  file_pane: TursoQuery[];
  file_markdown: TursoQuery[];
  files: TursoQuery[];
};

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
  parentId?: string;
  parentSlug?: string;
  parentTitle?: string;
}

export interface VisitContext {
  fingerprint_id: string;
  visit_id: string;
}

export type EventStream = {
  id: string;
  type: string;
  verb: string;
  targetId?: string;
  parentId?: string;
  duration?: number;
  score?: string;
  title?: string;
  targetSlug?: string;
  isContextPane?: string;
  object?: string | boolean;
};

export interface EventPayload {
  events: EventStream[];
  referrer?: Referrer;
  visit: VisitContext;
  contentMap?: ContentMap[];
}

export type EnvSettingType = "string" | "boolean" | "number" | "string[]";

export interface EnvSetting {
  name: string;
  defaultValue: string;
  type: EnvSettingType;
  description: string;
  group: string;
  priority: boolean;
  required: boolean;
}
export interface EnvSettingDatum extends EnvSetting {
  value: string;
}

export type StylesMemory = {
  [key in AllTag]?: ClassNamesPayloadDatumValue;
};

export interface CreationState {
  id: string | null;
  isInitialized: boolean;
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
  hot_story_fragments: HotItem[];
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
