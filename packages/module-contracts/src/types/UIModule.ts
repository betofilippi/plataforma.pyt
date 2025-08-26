/**
 * UI Module Type Contract
 * 
 * Defines the specific interface for UI modules that provide
 * user interface components and visual extensions.
 */

import { Module, ModuleContext, ModuleConfig } from '../contracts/ModuleAPI';
import { ModuleManifest, ModuleType } from '../contracts/ModuleManifest';

/**
 * UI module interface extending the base module
 */
export interface UIModule extends Module {
  /** UI module specific manifest */
  readonly manifest: UIModuleManifest;
  
  /** UI module configuration */
  readonly config: UIModuleConfig;
  
  /** UI context */
  readonly uiContext: UIModuleContext;
  
  /** Get UI components provided by this module */
  getUIComponents(): Promise<readonly UIComponent[]>;
  
  /** Get UI themes provided by this module */
  getUIThemes(): Promise<readonly UITheme[]>;
  
  /** Get UI layouts provided by this module */
  getUILayouts(): Promise<readonly UILayout[]>;
  
  /** Render UI component */
  renderComponent(spec: UIComponentRenderSpec): Promise<UIRenderResult>;
  
  /** Handle UI event */
  handleUIEvent(event: UIEvent): Promise<UIEventResult>;
  
  /** Get component metadata */
  getComponentMetadata(componentId: string): Promise<UIComponentMetadata>;
  
  /** Validate UI configuration */
  validateUIConfiguration(config: any): Promise<UIConfigurationValidation>;
  
  /** Get UI accessibility information */
  getAccessibilityInfo(): Promise<UIAccessibilityInfo>;
  
  /** Apply theme */
  applyTheme(themeId: string, options?: UIThemeOptions): Promise<UIThemeResult>;
  
  /** Get responsive breakpoints */
  getResponsiveBreakpoints(): Promise<UIResponsiveBreakpoints>;
}

/**
 * UI module manifest extension
 */
export interface UIModuleManifest extends ModuleManifest {
  /** Must be UI library type */
  readonly type: ModuleType.UI_LIBRARY;
  
  /** UI module type */
  readonly uiType: UIModuleType;
  
  /** UI components */
  readonly components: readonly UIComponentSpec[];
  
  /** UI themes */
  readonly themes: readonly UIThemeSpec[];
  
  /** UI layouts */
  readonly layouts: readonly UILayoutSpec[];
  
  /** UI styles */
  readonly styles: UIStyleSpec;
  
  /** UI assets */
  readonly assets: UIAssetSpec;
  
  /** UI compatibility */
  readonly compatibility: UICompatibilitySpec;
  
  /** UI accessibility */
  readonly accessibility: UIAccessibilitySpec;
}

/**
 * UI module types
 */
export enum UIModuleType {
  // Component Libraries
  COMPONENT_LIBRARY = 'component-library',
  DESIGN_SYSTEM = 'design-system',
  WIDGET_LIBRARY = 'widget-library',
  
  // Theme Providers
  THEME_PROVIDER = 'theme-provider',
  STYLE_PROVIDER = 'style-provider',
  
  // Layout Systems
  LAYOUT_SYSTEM = 'layout-system',
  GRID_SYSTEM = 'grid-system',
  
  // Visualization
  CHART_LIBRARY = 'chart-library',
  DATA_VISUALIZATION = 'data-visualization',
  
  // Interaction
  ANIMATION_LIBRARY = 'animation-library',
  GESTURE_LIBRARY = 'gesture-library',
  
  // Specialized
  FORM_LIBRARY = 'form-library',
  TABLE_LIBRARY = 'table-library',
  NAVIGATION_LIBRARY = 'navigation-library',
  
  // Custom
  CUSTOM = 'custom'
}

/**
 * UI component specification
 */
export interface UIComponentSpec {
  /** Component identifier */
  readonly id: string;
  
  /** Component name */
  readonly name: string;
  
  /** Component description */
  readonly description: string;
  
  /** Component category */
  readonly category: UIComponentCategory;
  
  /** Component type */
  readonly type: UIComponentType;
  
  /** Component properties */
  readonly properties: readonly UIComponentProperty[];
  
  /** Component events */
  readonly events: readonly UIComponentEvent[];
  
  /** Component slots */
  readonly slots: readonly UIComponentSlot[];
  
  /** Component variants */
  readonly variants: readonly UIComponentVariant[];
  
  /** Component examples */
  readonly examples: readonly UIComponentExample[];
  
  /** Component documentation */
  readonly documentation: UIComponentDocumentation;
}

export enum UIComponentCategory {
  // Layout
  LAYOUT = 'layout',
  CONTAINER = 'container',
  GRID = 'grid',
  FLEXBOX = 'flexbox',
  
  // Navigation
  NAVIGATION = 'navigation',
  MENU = 'menu',
  BREADCRUMB = 'breadcrumb',
  PAGINATION = 'pagination',
  
  // Input
  INPUT = 'input',
  FORM = 'form',
  BUTTON = 'button',
  SELECTION = 'selection',
  
  // Display
  DISPLAY = 'display',
  TEXT = 'text',
  IMAGE = 'image',
  ICON = 'icon',
  
  // Data
  TABLE = 'table',
  LIST = 'list',
  TREE = 'tree',
  CHART = 'chart',
  
  // Feedback
  FEEDBACK = 'feedback',
  LOADING = 'loading',
  PROGRESS = 'progress',
  NOTIFICATION = 'notification',
  
  // Overlay
  OVERLAY = 'overlay',
  MODAL = 'modal',
  TOOLTIP = 'tooltip',
  POPOVER = 'popover',
  
  // Custom
  CUSTOM = 'custom'
}

export enum UIComponentType {
  // Basic types
  FUNCTIONAL = 'functional',
  CLASS = 'class',
  STATELESS = 'stateless',
  STATEFUL = 'stateful',
  
  // Specialized types
  FORM_CONTROL = 'form-control',
  DATA_DISPLAY = 'data-display',
  NAVIGATION_ITEM = 'navigation-item',
  OVERLAY_COMPONENT = 'overlay-component',
  
  // Composite types
  COMPOUND = 'compound',
  COMPOSITE = 'composite',
  TEMPLATE = 'template',
  
  // Custom
  CUSTOM = 'custom'
}

export interface UIComponentProperty {
  readonly name: string;
  readonly type: UIPropertyType;
  readonly required: boolean;
  readonly default?: any;
  readonly description: string;
  readonly validation?: UIPropertyValidation;
  readonly examples?: readonly any[];
}

export enum UIPropertyType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  FUNCTION = 'function',
  ELEMENT = 'element',
  NODE = 'node',
  COMPONENT = 'component',
  ENUM = 'enum',
  UNION = 'union',
  CUSTOM = 'custom'
}

export interface UIPropertyValidation {
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly enum?: readonly any[];
  readonly custom?: UICustomValidator;
}

export interface UICustomValidator {
  readonly validator: string;
  readonly message: string;
  readonly params?: Record<string, any>;
}

export interface UIComponentEvent {
  readonly name: string;
  readonly description: string;
  readonly payload: UIEventPayloadSpec;
  readonly bubbles?: boolean;
  readonly cancelable?: boolean;
}

export interface UIEventPayloadSpec {
  readonly type: string;
  readonly properties: Record<string, UIPropertySpec>;
}

export interface UIPropertySpec {
  readonly type: string;
  readonly description?: string;
  readonly required?: boolean;
}

export interface UIComponentSlot {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
  readonly contentType: UISlotContentType;
  readonly restrictions?: UISlotRestrictions;
}

export enum UISlotContentType {
  TEXT = 'text',
  HTML = 'html',
  COMPONENT = 'component',
  ELEMENT = 'element',
  ANY = 'any'
}

export interface UISlotRestrictions {
  readonly allowedElements?: readonly string[];
  readonly forbiddenElements?: readonly string[];
  readonly maxChildren?: number;
  readonly minChildren?: number;
}

export interface UIComponentVariant {
  readonly name: string;
  readonly description: string;
  readonly properties: Record<string, any>;
  readonly preview?: string;
}

export interface UIComponentExample {
  readonly name: string;
  readonly description: string;
  readonly code: string;
  readonly preview?: string;
  readonly props?: Record<string, any>;
}

export interface UIComponentDocumentation {
  readonly overview: string;
  readonly usage: string;
  readonly accessibility: string;
  readonly performance: string;
  readonly migration?: string;
  readonly api?: string;
}

/**
 * UI theme specification
 */
export interface UIThemeSpec {
  /** Theme identifier */
  readonly id: string;
  
  /** Theme name */
  readonly name: string;
  
  /** Theme description */
  readonly description: string;
  
  /** Theme type */
  readonly type: UIThemeType;
  
  /** Theme colors */
  readonly colors: UIColorPalette;
  
  /** Theme typography */
  readonly typography: UITypographySpec;
  
  /** Theme spacing */
  readonly spacing: UISpacingSpec;
  
  /** Theme shadows */
  readonly shadows: UIShadowSpec;
  
  /** Theme animations */
  readonly animations: UIAnimationSpec;
  
  /** Theme breakpoints */
  readonly breakpoints: UIBreakpointSpec;
  
  /** Theme components */
  readonly components: Record<string, UIComponentTheme>;
}

export enum UIThemeType {
  LIGHT = 'light',
  DARK = 'dark',
  HIGH_CONTRAST = 'high-contrast',
  CUSTOM = 'custom'
}

export interface UIColorPalette {
  readonly primary: UIColorShade;
  readonly secondary: UIColorShade;
  readonly accent: UIColorShade;
  readonly neutral: UIColorShade;
  readonly semantic: UISemanticColors;
  readonly custom?: Record<string, UIColorShade>;
}

export interface UIColorShade {
  readonly 50: string;
  readonly 100: string;
  readonly 200: string;
  readonly 300: string;
  readonly 400: string;
  readonly 500: string;
  readonly 600: string;
  readonly 700: string;
  readonly 800: string;
  readonly 900: string;
  readonly 950?: string;
}

export interface UISemanticColors {
  readonly success: UIColorShade;
  readonly warning: UIColorShade;
  readonly error: UIColorShade;
  readonly info: UIColorShade;
}

export interface UITypographySpec {
  readonly fontFamily: UIFontFamily;
  readonly fontSize: UIFontSizeScale;
  readonly fontWeight: UIFontWeightScale;
  readonly lineHeight: UILineHeightScale;
  readonly letterSpacing: UILetterSpacingScale;
}

export interface UIFontFamily {
  readonly sans: readonly string[];
  readonly serif: readonly string[];
  readonly mono: readonly string[];
  readonly display?: readonly string[];
}

export interface UIFontSizeScale {
  readonly xs: string;
  readonly sm: string;
  readonly base: string;
  readonly lg: string;
  readonly xl: string;
  readonly '2xl': string;
  readonly '3xl': string;
  readonly '4xl': string;
  readonly '5xl': string;
  readonly '6xl': string;
}

export interface UIFontWeightScale {
  readonly thin: number;
  readonly extralight: number;
  readonly light: number;
  readonly normal: number;
  readonly medium: number;
  readonly semibold: number;
  readonly bold: number;
  readonly extrabold: number;
  readonly black: number;
}

export interface UILineHeightScale {
  readonly none: number;
  readonly tight: number;
  readonly snug: number;
  readonly normal: number;
  readonly relaxed: number;
  readonly loose: number;
}

export interface UILetterSpacingScale {
  readonly tighter: string;
  readonly tight: string;
  readonly normal: string;
  readonly wide: string;
  readonly wider: string;
  readonly widest: string;
}

export interface UISpacingSpec {
  readonly 0: string;
  readonly px: string;
  readonly 0.5: string;
  readonly 1: string;
  readonly 1.5: string;
  readonly 2: string;
  readonly 2.5: string;
  readonly 3: string;
  readonly 3.5: string;
  readonly 4: string;
  readonly 5: string;
  readonly 6: string;
  readonly 7: string;
  readonly 8: string;
  readonly 9: string;
  readonly 10: string;
  readonly 11: string;
  readonly 12: string;
  readonly 14: string;
  readonly 16: string;
  readonly 20: string;
  readonly 24: string;
  readonly 28: string;
  readonly 32: string;
  readonly 36: string;
  readonly 40: string;
  readonly 44: string;
  readonly 48: string;
  readonly 52: string;
  readonly 56: string;
  readonly 60: string;
  readonly 64: string;
  readonly 72: string;
  readonly 80: string;
  readonly 96: string;
}

export interface UIShadowSpec {
  readonly sm: string;
  readonly base: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly '2xl': string;
  readonly inner: string;
  readonly none: string;
}

export interface UIAnimationSpec {
  readonly duration: UIAnimationDurationSpec;
  readonly easing: UIAnimationEasingSpec;
  readonly transitions: Record<string, UITransitionSpec>;
}

export interface UIAnimationDurationSpec {
  readonly fastest: string;
  readonly faster: string;
  readonly fast: string;
  readonly normal: string;
  readonly slow: string;
  readonly slower: string;
  readonly slowest: string;
}

export interface UIAnimationEasingSpec {
  readonly linear: string;
  readonly easeIn: string;
  readonly easeOut: string;
  readonly easeInOut: string;
  readonly easeInBack: string;
  readonly easeOutBack: string;
  readonly easeInOutBack: string;
}

export interface UITransitionSpec {
  readonly property: string;
  readonly duration: string;
  readonly easing: string;
  readonly delay?: string;
}

export interface UIBreakpointSpec {
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly '2xl': string;
}

export interface UIComponentTheme {
  readonly baseStyles: Record<string, any>;
  readonly variants: Record<string, Record<string, any>>;
  readonly sizes: Record<string, Record<string, any>>;
  readonly states: Record<string, Record<string, any>>;
}

/**
 * UI layout specification
 */
export interface UILayoutSpec {
  /** Layout identifier */
  readonly id: string;
  
  /** Layout name */
  readonly name: string;
  
  /** Layout type */
  readonly type: UILayoutType;
  
  /** Layout structure */
  readonly structure: UILayoutStructure;
  
  /** Layout regions */
  readonly regions: readonly UILayoutRegion[];
  
  /** Layout responsive behavior */
  readonly responsive: UILayoutResponsive;
  
  /** Layout constraints */
  readonly constraints: UILayoutConstraints;
}

export enum UILayoutType {
  FIXED = 'fixed',
  FLUID = 'fluid',
  RESPONSIVE = 'responsive',
  ADAPTIVE = 'adaptive',
  GRID = 'grid',
  FLEXBOX = 'flexbox',
  MASONRY = 'masonry',
  CUSTOM = 'custom'
}

export interface UILayoutStructure {
  readonly type: 'grid' | 'flexbox' | 'absolute' | 'custom';
  readonly columns?: number;
  readonly rows?: number;
  readonly gaps?: UILayoutGaps;
  readonly alignment?: UILayoutAlignment;
}

export interface UILayoutGaps {
  readonly column: string;
  readonly row: string;
}

export interface UILayoutAlignment {
  readonly horizontal: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  readonly vertical: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
}

export interface UILayoutRegion {
  readonly id: string;
  readonly name: string;
  readonly type: UILayoutRegionType;
  readonly position: UILayoutPosition;
  readonly sizing: UILayoutSizing;
  readonly scrollable: boolean;
  readonly collapsible: boolean;
}

export enum UILayoutRegionType {
  HEADER = 'header',
  FOOTER = 'footer',
  SIDEBAR = 'sidebar',
  MAIN = 'main',
  CONTENT = 'content',
  NAVIGATION = 'navigation',
  PANEL = 'panel',
  CUSTOM = 'custom'
}

export interface UILayoutPosition {
  readonly column?: number | string;
  readonly row?: number | string;
  readonly span?: UILayoutSpan;
}

export interface UILayoutSpan {
  readonly columns?: number;
  readonly rows?: number;
}

export interface UILayoutSizing {
  readonly width?: UISizeValue;
  readonly height?: UISizeValue;
  readonly minWidth?: UISizeValue;
  readonly minHeight?: UISizeValue;
  readonly maxWidth?: UISizeValue;
  readonly maxHeight?: UISizeValue;
}

export interface UISizeValue {
  readonly value: number | string;
  readonly unit: 'px' | '%' | 'em' | 'rem' | 'vh' | 'vw' | 'fr' | 'auto' | 'min-content' | 'max-content';
}

export interface UILayoutResponsive {
  readonly breakpoints: Record<string, UILayoutBreakpoint>;
  readonly strategy: 'mobile-first' | 'desktop-first' | 'adaptive';
}

export interface UILayoutBreakpoint {
  readonly structure?: Partial<UILayoutStructure>;
  readonly regions?: Partial<Record<string, Partial<UILayoutRegion>>>;
  readonly hidden?: readonly string[];
  readonly reorder?: Record<string, number>;
}

export interface UILayoutConstraints {
  readonly minWidth?: string;
  readonly maxWidth?: string;
  readonly minHeight?: string;
  readonly maxHeight?: string;
  readonly aspectRatio?: number;
}

/**
 * UI style specification
 */
export interface UIStyleSpec {
  /** CSS framework */
  readonly framework?: UIStyleFramework;
  
  /** CSS methodology */
  readonly methodology?: UIStyleMethodology;
  
  /** Style architecture */
  readonly architecture: UIStyleArchitecture;
  
  /** Style customization */
  readonly customization: UIStyleCustomization;
}

export enum UIStyleFramework {
  TAILWIND = 'tailwind',
  BOOTSTRAP = 'bootstrap',
  BULMA = 'bulma',
  FOUNDATION = 'foundation',
  SEMANTIC_UI = 'semantic-ui',
  MATERIAL_UI = 'material-ui',
  ANT_DESIGN = 'ant-design',
  CHAKRA_UI = 'chakra-ui',
  CUSTOM = 'custom'
}

export enum UIStyleMethodology {
  BEM = 'bem',
  ATOMIC = 'atomic',
  OOCSS = 'oocss',
  SMACSS = 'smacss',
  ITCSS = 'itcss',
  CUBE = 'cube',
  CUSTOM = 'custom'
}

export interface UIStyleArchitecture {
  readonly structure: UIStyleStructure;
  readonly naming: UIStyleNaming;
  readonly organization: UIStyleOrganization;
}

export interface UIStyleStructure {
  readonly layers: readonly UIStyleLayer[];
  readonly cascade: UIStyleCascade;
  readonly specificity: UIStyleSpecificity;
}

export interface UIStyleLayer {
  readonly name: string;
  readonly priority: number;
  readonly purpose: string;
}

export interface UIStyleCascade {
  readonly strategy: 'natural' | 'controlled' | 'scoped';
  readonly isolation: boolean;
}

export interface UIStyleSpecificity {
  readonly strategy: 'low' | 'medium' | 'high' | 'mixed';
  readonly utilities: boolean;
}

export interface UIStyleNaming {
  readonly convention: string;
  readonly prefix?: string;
  readonly namespace?: string;
}

export interface UIStyleOrganization {
  readonly structure: 'flat' | 'nested' | 'modular' | 'atomic';
  readonly grouping: 'component' | 'utility' | 'feature' | 'layer';
}

export interface UIStyleCustomization {
  readonly variables: UIStyleVariables;
  readonly overrides: UIStyleOverrides;
  readonly extensions: UIStyleExtensions;
}

export interface UIStyleVariables {
  readonly css: boolean;
  readonly sass: boolean;
  readonly less: boolean;
  readonly stylus: boolean;
}

export interface UIStyleOverrides {
  readonly allowed: boolean;
  readonly scope: 'global' | 'component' | 'instance';
  readonly specificity: 'low' | 'medium' | 'high';
}

export interface UIStyleExtensions {
  readonly plugins: boolean;
  readonly utilities: boolean;
  readonly components: boolean;
}

/**
 * UI asset specification
 */
export interface UIAssetSpec {
  /** Icons */
  readonly icons: UIIconAssetSpec;
  
  /** Images */
  readonly images: UIImageAssetSpec;
  
  /** Fonts */
  readonly fonts: UIFontAssetSpec;
  
  /** Animations */
  readonly animations: UIAnimationAssetSpec;
  
  /** Media */
  readonly media: UIMediaAssetSpec;
}

export interface UIIconAssetSpec {
  readonly format: readonly UIIconFormat[];
  readonly sizes: readonly number[];
  readonly variants: readonly string[];
  readonly collection?: string;
}

export enum UIIconFormat {
  SVG = 'svg',
  PNG = 'png',
  WEBP = 'webp',
  ICO = 'ico',
  FONT = 'font'
}

export interface UIImageAssetSpec {
  readonly formats: readonly UIImageFormat[];
  readonly responsive: boolean;
  readonly lazy: boolean;
  readonly optimization: UIImageOptimization;
}

export enum UIImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
  SVG = 'svg'
}

export interface UIImageOptimization {
  readonly compression: boolean;
  readonly quality: number;
  readonly progressive: boolean;
  readonly lossless: boolean;
}

export interface UIFontAssetSpec {
  readonly formats: readonly UIFontFormat[];
  readonly subsets: readonly string[];
  readonly weights: readonly number[];
  readonly styles: readonly UIFontStyle[];
  readonly loading: UIFontLoading;
}

export enum UIFontFormat {
  WOFF2 = 'woff2',
  WOFF = 'woff',
  TTF = 'ttf',
  EOT = 'eot',
  SVG = 'svg'
}

export enum UIFontStyle {
  NORMAL = 'normal',
  ITALIC = 'italic',
  OBLIQUE = 'oblique'
}

export interface UIFontLoading {
  readonly strategy: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  readonly preload: boolean;
  readonly fallback: readonly string[];
}

export interface UIAnimationAssetSpec {
  readonly formats: readonly UIAnimationFormat[];
  readonly duration: UIAnimationDuration;
  readonly easing: readonly string[];
  readonly interactive: boolean;
}

export enum UIAnimationFormat {
  CSS = 'css',
  JAVASCRIPT = 'javascript',
  LOTTIE = 'lottie',
  GIF = 'gif',
  APNG = 'apng'
}

export interface UIAnimationDuration {
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

export interface UIMediaAssetSpec {
  readonly video: UIVideoAssetSpec;
  readonly audio: UIAudioAssetSpec;
}

export interface UIVideoAssetSpec {
  readonly formats: readonly UIVideoFormat[];
  readonly quality: readonly string[];
  readonly autoplay: boolean;
  readonly controls: boolean;
}

export enum UIVideoFormat {
  MP4 = 'mp4',
  WEBM = 'webm',
  OGV = 'ogv'
}

export interface UIAudioAssetSpec {
  readonly formats: readonly UIAudioFormat[];
  readonly quality: readonly string[];
  readonly controls: boolean;
}

export enum UIAudioFormat {
  MP3 = 'mp3',
  OGG = 'ogg',
  WAV = 'wav',
  AAC = 'aac'
}

/**
 * UI compatibility specification
 */
export interface UICompatibilitySpec {
  /** Browser compatibility */
  readonly browsers: UIBrowserCompatibility;
  
  /** Device compatibility */
  readonly devices: UIDeviceCompatibility;
  
  /** Framework compatibility */
  readonly frameworks: UIFrameworkCompatibility;
  
  /** Platform compatibility */
  readonly platforms: UIPlatformCompatibility;
}

export interface UIBrowserCompatibility {
  readonly supported: readonly UIBrowserSupport[];
  readonly polyfills: readonly string[];
  readonly fallbacks: readonly UIBrowserFallback[];
}

export interface UIBrowserSupport {
  readonly browser: string;
  readonly version: string;
  readonly features: readonly string[];
  readonly limitations?: readonly string[];
}

export interface UIBrowserFallback {
  readonly feature: string;
  readonly fallback: string;
  readonly detection: string;
}

export interface UIDeviceCompatibility {
  readonly mobile: boolean;
  readonly tablet: boolean;
  readonly desktop: boolean;
  readonly tv: boolean;
  readonly wearable: boolean;
  readonly responsive: UIResponsiveCompatibility;
}

export interface UIResponsiveCompatibility {
  readonly breakpoints: readonly string[];
  readonly strategy: 'mobile-first' | 'desktop-first' | 'adaptive';
  readonly flexible: boolean;
}

export interface UIFrameworkCompatibility {
  readonly react: UIReactCompatibility;
  readonly vue: UIVueCompatibility;
  readonly angular: UIAngularCompatibility;
  readonly svelte: UISvelteCompatibility;
  readonly vanilla: boolean;
}

export interface UIReactCompatibility {
  readonly supported: boolean;
  readonly versions: readonly string[];
  readonly features: readonly string[];
}

export interface UIVueCompatibility {
  readonly supported: boolean;
  readonly versions: readonly string[];
  readonly composition: boolean;
  readonly options: boolean;
}

export interface UIAngularCompatibility {
  readonly supported: boolean;
  readonly versions: readonly string[];
  readonly ivy: boolean;
}

export interface UISvelteCompatibility {
  readonly supported: boolean;
  readonly versions: readonly string[];
  readonly kit: boolean;
}

export interface UIPlatformCompatibility {
  readonly web: boolean;
  readonly mobile: UIMobileCompatibility;
  readonly desktop: UIDesktopCompatibility;
  readonly ssr: boolean;
  readonly ssg: boolean;
}

export interface UIMobileCompatibility {
  readonly ios: boolean;
  readonly android: boolean;
  readonly hybrid: boolean;
  readonly pwa: boolean;
}

export interface UIDesktopCompatibility {
  readonly electron: boolean;
  readonly tauri: boolean;
  readonly nwjs: boolean;
}

/**
 * UI accessibility specification
 */
export interface UIAccessibilitySpec {
  /** WCAG compliance level */
  readonly wcag: UIWCAGLevel;
  
  /** Accessibility features */
  readonly features: UIAccessibilityFeatures;
  
  /** Screen reader support */
  readonly screenReader: UIScreenReaderSupport;
  
  /** Keyboard navigation */
  readonly keyboard: UIKeyboardSupport;
  
  /** Color and contrast */
  readonly colorContrast: UIColorContrastSpec;
}

export enum UIWCAGLevel {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA'
}

export interface UIAccessibilityFeatures {
  readonly ariaLabels: boolean;
  readonly ariaDescriptions: boolean;
  readonly focusManagement: boolean;
  readonly skipLinks: boolean;
  readonly landmarkRoles: boolean;
  readonly liveRegions: boolean;
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
}

export interface UIScreenReaderSupport {
  readonly nvda: boolean;
  readonly jaws: boolean;
  readonly voiceOver: boolean;
  readonly talkBack: boolean;
  readonly announcements: boolean;
}

export interface UIKeyboardSupport {
  readonly navigation: boolean;
  readonly shortcuts: boolean;
  readonly focus: UIFocusManagement;
  readonly customKeys: readonly UICustomKey[];
}

export interface UIFocusManagement {
  readonly visible: boolean;
  readonly trapping: boolean;
  readonly restoration: boolean;
  readonly skip: boolean;
}

export interface UICustomKey {
  readonly combination: string;
  readonly action: string;
  readonly description: string;
}

export interface UIColorContrastSpec {
  readonly minimum: number;
  readonly enhanced: number;
  readonly testing: boolean;
  readonly automatic: boolean;
}

/**
 * UI module configuration
 */
export interface UIModuleConfig extends ModuleConfig {
  /** UI configuration */
  readonly ui: UIConfiguration;
  
  /** Theme configuration */
  readonly theme: UIThemeConfiguration;
  
  /** Responsive configuration */
  readonly responsive: UIResponsiveConfiguration;
  
  /** Performance configuration */
  readonly performance: UIPerformanceConfiguration;
}

export interface UIConfiguration {
  readonly framework: string;
  readonly version: string;
  readonly customization: UICustomizationConfig;
  readonly debugging: UIDebuggingConfig;
}

export interface UICustomizationConfig {
  readonly themes: boolean;
  readonly components: boolean;
  readonly variables: boolean;
  readonly overrides: boolean;
}

export interface UIDebuggingConfig {
  readonly enabled: boolean;
  readonly level: 'basic' | 'detailed' | 'verbose';
  readonly tools: readonly string[];
}

export interface UIThemeConfiguration {
  readonly default: string;
  readonly switching: boolean;
  readonly persistence: boolean;
  readonly auto: UIAutoThemeConfig;
}

export interface UIAutoThemeConfig {
  readonly enabled: boolean;
  readonly system: boolean;
  readonly schedule: UIThemeSchedule;
}

export interface UIThemeSchedule {
  readonly lightStart: string;
  readonly darkStart: string;
  readonly timezone: string;
}

export interface UIResponsiveConfiguration {
  readonly enabled: boolean;
  readonly strategy: 'mobile-first' | 'desktop-first' | 'adaptive';
  readonly breakpoints: Record<string, string>;
  readonly testing: UIResponsiveTestingConfig;
}

export interface UIResponsiveTestingConfig {
  readonly enabled: boolean;
  readonly devices: readonly string[];
  readonly screenshots: boolean;
}

export interface UIPerformanceConfiguration {
  readonly lazy: boolean;
  readonly chunking: boolean;
  readonly preloading: UIPreloadingConfig;
  readonly optimization: UIOptimizationConfig;
  readonly monitoring: UIMonitoringConfig;
}

export interface UIPreloadingConfig {
  readonly critical: boolean;
  readonly fonts: boolean;
  readonly images: boolean;
  readonly components: readonly string[];
}

export interface UIOptimizationConfig {
  readonly bundling: boolean;
  readonly minification: boolean;
  readonly compression: boolean;
  readonly treeShaking: boolean;
}

export interface UIMonitoringConfig {
  readonly enabled: boolean;
  readonly metrics: readonly string[];
  readonly threshold: UIPerformanceThresholds;
}

export interface UIPerformanceThresholds {
  readonly fcp: number;
  readonly lcp: number;
  readonly fid: number;
  readonly cls: number;
}

/**
 * UI module context
 */
export interface UIModuleContext extends ModuleContext {
  /** UI context data */
  readonly ui: UIContextData;
  
  /** Rendering context */
  readonly rendering: UIRenderingContext;
  
  /** Interaction context */
  readonly interaction: UIInteractionContext;
  
  /** Accessibility context */
  readonly accessibility: UIAccessibilityContext;
}

export interface UIContextData {
  readonly framework: string;
  readonly version: string;
  readonly theme: UIThemeContext;
  readonly viewport: UIViewportContext;
  readonly device: UIDeviceContext;
}

export interface UIThemeContext {
  readonly current: string;
  readonly available: readonly string[];
  readonly variables: Record<string, string>;
  readonly mode: 'light' | 'dark' | 'auto' | 'high-contrast';
}

export interface UIViewportContext {
  readonly width: number;
  readonly height: number;
  readonly breakpoint: string;
  readonly orientation: 'portrait' | 'landscape';
  readonly zoom: number;
}

export interface UIDeviceContext {
  readonly type: 'mobile' | 'tablet' | 'desktop' | 'tv';
  readonly os: string;
  readonly browser: string;
  readonly touch: boolean;
  readonly hover: boolean;
  readonly pointer: 'fine' | 'coarse' | 'none';
}

export interface UIRenderingContext {
  readonly renderer: string;
  readonly mode: 'client' | 'server' | 'hybrid';
  readonly hydration: boolean;
  readonly streaming: boolean;
  readonly cache: UIRenderingCache;
}

export interface UIRenderingCache {
  readonly enabled: boolean;
  readonly strategy: 'memory' | 'disk' | 'network';
  readonly ttl: number;
}

export interface UIInteractionContext {
  readonly input: UIInputContext;
  readonly focus: UIFocusContext;
  readonly gesture: UIGestureContext;
}

export interface UIInputContext {
  readonly keyboard: boolean;
  readonly mouse: boolean;
  readonly touch: boolean;
  readonly stylus: boolean;
  readonly voice: boolean;
}

export interface UIFocusContext {
  readonly current: string;
  readonly history: readonly string[];
  readonly trap: boolean;
  readonly visible: boolean;
}

export interface UIGestureContext {
  readonly swipe: boolean;
  readonly pinch: boolean;
  readonly rotate: boolean;
  readonly tap: boolean;
  readonly longPress: boolean;
}

export interface UIAccessibilityContext {
  readonly screenReader: boolean;
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly largeText: boolean;
  readonly colorBlind: UIColorBlindness;
}

export enum UIColorBlindness {
  NONE = 'none',
  PROTANOPIA = 'protanopia',
  DEUTERANOPIA = 'deuteranopia',
  TRITANOPIA = 'tritanopia',
  ACHROMATOPSIA = 'achromatopsia'
}

/**
 * UI module interfaces
 */
export interface UIComponent {
  readonly spec: UIComponentSpec;
  readonly implementation: UIComponentImplementation;
  readonly metadata: UIComponentMetadata;
}

export interface UIComponentImplementation {
  readonly render: UIRenderFunction;
  readonly events: Record<string, UIEventHandler>;
  readonly lifecycle: UIComponentLifecycle;
}

export interface UIRenderFunction {
  (props: any, context: UIRenderContext): any;
}

export interface UIEventHandler {
  (event: UIEvent): void | Promise<void>;
}

export interface UIComponentLifecycle {
  readonly mount?: UILifecycleHook;
  readonly unmount?: UILifecycleHook;
  readonly update?: UILifecycleHook;
  readonly error?: UIErrorHook;
}

export interface UILifecycleHook {
  (): void | Promise<void>;
}

export interface UIErrorHook {
  (error: Error): void | Promise<void>;
}

export interface UIRenderContext {
  readonly props: any;
  readonly state: any;
  readonly theme: UIThemeContext;
  readonly device: UIDeviceContext;
  readonly accessibility: UIAccessibilityContext;
}

export interface UITheme {
  readonly spec: UIThemeSpec;
  readonly implementation: UIThemeImplementation;
  readonly metadata: UIThemeMetadata;
}

export interface UIThemeImplementation {
  readonly variables: Record<string, string>;
  readonly components: Record<string, UIComponentTheme>;
  readonly utilities: Record<string, string>;
}

export interface UILayout {
  readonly spec: UILayoutSpec;
  readonly implementation: UILayoutImplementation;
  readonly metadata: UILayoutMetadata;
}

export interface UILayoutImplementation {
  readonly render: UILayoutRenderFunction;
  readonly responsive: UIResponsiveImplementation;
}

export interface UILayoutRenderFunction {
  (regions: Record<string, any>, context: UIRenderContext): any;
}

export interface UIResponsiveImplementation {
  readonly breakpoints: Record<string, UIBreakpointImplementation>;
}

export interface UIBreakpointImplementation {
  readonly media: string;
  readonly styles: Record<string, any>;
}

/**
 * UI events and results
 */
export interface UIComponentRenderSpec {
  readonly componentId: string;
  readonly props: any;
  readonly context: UIRenderContext;
  readonly options: UIRenderOptions;
}

export interface UIRenderOptions {
  readonly ssr: boolean;
  readonly hydrate: boolean;
  readonly cache: boolean;
  readonly optimize: boolean;
}

export interface UIRenderResult {
  readonly success: boolean;
  readonly element: any;
  readonly metadata: UIRenderMetadata;
  readonly error?: string;
}

export interface UIRenderMetadata {
  readonly renderTime: number;
  readonly componentCount: number;
  readonly size: number;
  readonly warnings: readonly string[];
}

export interface UIEvent {
  readonly type: string;
  readonly target: string;
  readonly data: any;
  readonly timestamp: string;
  readonly context: UIEventContext;
}

export interface UIEventContext {
  readonly component?: string;
  readonly element?: string;
  readonly user?: string;
  readonly session?: string;
}

export interface UIEventResult {
  readonly handled: boolean;
  readonly prevented: boolean;
  readonly stopped: boolean;
  readonly result?: any;
}

export interface UIThemeOptions {
  readonly variables?: Record<string, string>;
  readonly components?: readonly string[];
  readonly merge?: boolean;
}

export interface UIThemeResult {
  readonly success: boolean;
  readonly applied: readonly string[];
  readonly warnings?: readonly string[];
  readonly error?: string;
}

/**
 * UI metadata and validation
 */
export interface UIComponentMetadata {
  readonly size: UIComponentSize;
  readonly performance: UIComponentPerformance;
  readonly accessibility: UIComponentAccessibility;
  readonly compatibility: UIComponentCompatibility;
}

export interface UIComponentSize {
  readonly bundle: number;
  readonly runtime: number;
  readonly dependencies: number;
}

export interface UIComponentPerformance {
  readonly renderTime: number;
  readonly memoryUsage: number;
  readonly reRenders: number;
}

export interface UIComponentAccessibility {
  readonly wcag: UIWCAGLevel;
  readonly features: readonly string[];
  readonly issues: readonly UIAccessibilityIssue[];
}

export interface UIAccessibilityIssue {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly message: string;
  readonly rule: string;
  readonly suggestion?: string;
}

export interface UIComponentCompatibility {
  readonly browsers: readonly string[];
  readonly frameworks: readonly string[];
  readonly devices: readonly string[];
}

export interface UIThemeMetadata {
  readonly size: number;
  readonly variables: number;
  readonly components: number;
  readonly compatibility: UIThemeCompatibility;
}

export interface UIThemeCompatibility {
  readonly themes: readonly string[];
  readonly modes: readonly string[];
  readonly frameworks: readonly string[];
}

export interface UILayoutMetadata {
  readonly responsive: boolean;
  readonly regions: number;
  readonly breakpoints: number;
  readonly complexity: 'simple' | 'medium' | 'complex';
}

export interface UIConfigurationValidation {
  readonly valid: boolean;
  readonly errors: readonly UIConfigurationError[];
  readonly warnings: readonly UIConfigurationWarning[];
  readonly suggestions: readonly string[];
}

export interface UIConfigurationError {
  readonly field: string;
  readonly message: string;
  readonly value: any;
}

export interface UIConfigurationWarning {
  readonly field: string;
  readonly message: string;
  readonly impact: 'low' | 'medium' | 'high';
}

export interface UIAccessibilityInfo {
  readonly compliance: UIWCAGLevel;
  readonly features: readonly UIAccessibilityFeature[];
  readonly issues: readonly UIAccessibilityIssue[];
  readonly score: number;
}

export interface UIAccessibilityFeature {
  readonly name: string;
  readonly status: 'supported' | 'partial' | 'not-supported';
  readonly description: string;
}

export interface UIResponsiveBreakpoints {
  readonly breakpoints: Record<string, UIBreakpointInfo>;
  readonly strategy: 'mobile-first' | 'desktop-first' | 'adaptive';
  readonly flexible: boolean;
}

export interface UIBreakpointInfo {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly typical: readonly string[];
}