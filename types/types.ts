export type AppState = {
  enabled: boolean;
  rippleEnabled: boolean;
  smartCursorEnabled: boolean;
  strictSafety: boolean;
  longPressDelay: number;
  primaryColor: string;
  topEdgeExitEnabled: boolean;
  autoFullscreenEnabled: boolean;
  videoClickFullscreen: boolean;
  videoKeyFullscreen: boolean;
};

export type Store = AppState & {
  env: string;
};
