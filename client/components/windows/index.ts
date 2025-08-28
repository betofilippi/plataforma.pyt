export {
  WindowManagerProvider,
  useWindowManager,
  useCreateWindow,
} from "./WindowManager";
export type { WindowState, WindowManagerContextType } from "./WindowManager";
export { Window } from "./Window";
export { WindowDesktop } from "./WindowDesktop";
export { WindowTaskbar } from "./WindowTaskbar";

// New advanced window system components
export { OSAdvancedTaskbar } from "./OSAdvancedTaskbar";
export { windowFactory, useWindowFactory } from "./core/WindowFactory";
export type { WindowConfig, WindowInstance, WindowTemplate } from "./core/WindowFactory";
export { ModuleDesktop } from "./core/ModuleDesktop";
