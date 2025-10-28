// Main entry point for seokit package
export * from "./types.js";
export { loadConfig, validateFontPaths, validateConfig } from "./config.js";
export {
  ConfigWatcher,
  watchConfig,
  type ConfigChangeCallback,
  type ConfigWatcherOptions,
} from "./config-watcher.js";
export {
  detectFramework,
  type FrameworkType,
  type FrameworkInfo,
} from "./framework-detector.js";
export {
  fetchTemplateHtml,
  type TemplateEndpointResponse,
} from "./template-fetcher.js";
export {
  loadFonts,
  clearFontCache,
  getFontCacheSize,
  type SatoriFont,
} from "./font-loader.js";
export { htmlToSvg } from "./html-to-svg.js";
export { svgToPng } from "./svg-to-png.js";
export {
  SeoKitError,
  ErrorCode,
  isSeoKitError,
  toSeoKitError,
  createConfigMissingError,
  createConfigInvalidError,
  createFontFileNotFoundError,
  createTemplateUnreachableError,
  createTemplateTimeoutError,
  createTemplateRenderFailedError,
  createTemplateInvalidResponseError,
  createSatoriConversionError,
  createSharpConversionError,
  createFontLoadError,
  createPortInUseError,
  createPortAccessDeniedError,
  createImageGenerationError,
} from "./errors.js";
export { formatCliError, handleCliError } from "./cli-error-formatter.js";
export {
  createLogger,
  getLogger,
  setLogger,
  LogLevel,
  type LoggerConfig,
} from "./logger.js";
export {
  getTemplatesDir,
  getTemplateContent,
  templateExists,
  getAvailableTemplates,
  getTemplateDescription,
} from "./template-manager.js";
export {
  getBundledFontsDir,
  getBundledFontPath,
  getDefaultFontConfig,
  isBundledFont,
} from "./bundled-fonts.js";
