import type { Config, PaneDesign, Theme } from "@/types";

export interface PaneDesignSnapshotProps {
  design: PaneDesign;
  theme: Theme;
  brandColors: string[];
  onStart?: () => void;
  onComplete?: (imageData: string) => void;
  forceRegenerate?: boolean;
  config: Config;
}
