export type AppState = {
  enabled: boolean;
  rippleEnabled: boolean;
  smartCursorEnabled: boolean;
  strictSafety: boolean;
  longPressDelay: number;
  primaryColor: string;
  topEdgeExitEnabled: boolean;
  autoFullscreenEnabled: boolean;
  oneWayFullscreen: boolean;
  autoFullscreenOnNewVideo: boolean;
  autoVideoFullscreen: boolean;
};

export type Store = AppState & {
  env: string;
};
