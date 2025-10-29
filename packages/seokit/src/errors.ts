/**
 * Custom error classes and error handling utilities for SeoKit
 */

/**
 * Error codes for different types of SeoKit errors
 */
export enum ErrorCode {
  // Configuration errors
  CONFIG_MISSING = "CONFIG_MISSING",
  CONFIG_INVALID = "CONFIG_INVALID",
  CONFIG_VALIDATION_FAILED = "CONFIG_VALIDATION_FAILED",
  FONT_FILE_NOT_FOUND = "FONT_FILE_NOT_FOUND",

  // Template endpoint errors
  TEMPLATE_UNREACHABLE = "TEMPLATE_UNREACHABLE",
  TEMPLATE_TIMEOUT = "TEMPLATE_TIMEOUT",
  TEMPLATE_RENDER_FAILED = "TEMPLATE_RENDER_FAILED",
  TEMPLATE_INVALID_RESPONSE = "TEMPLATE_INVALID_RESPONSE",

  // Image generation errors
  IMAGE_GENERATION_FAILED = "IMAGE_GENERATION_FAILED",
  SATORI_CONVERSION_FAILED = "SATORI_CONVERSION_FAILED",
  SHARP_CONVERSION_FAILED = "SHARP_CONVERSION_FAILED",
  FONT_LOAD_FAILED = "FONT_LOAD_FAILED",

  // Server errors
  PORT_IN_USE = "PORT_IN_USE",
  PORT_ACCESS_DENIED = "PORT_ACCESS_DENIED",
  SERVER_START_FAILED = "SERVER_START_FAILED",

  // Browser errors
  BROWSER_LAUNCH_ERROR = "BROWSER_LAUNCH_ERROR",
  BROWSER_CRASHED = "BROWSER_CRASHED",
  BROWSER_TIMEOUT = "BROWSER_TIMEOUT",

  // Page pool errors
  PAGE_POOL_EXHAUSTED = "PAGE_POOL_EXHAUSTED",
  PAGE_ACQUISITION_TIMEOUT = "PAGE_ACQUISITION_TIMEOUT",

  // Rendering errors
  RENDER_ERROR = "RENDER_ERROR",
  RESOURCE_LOAD_ERROR = "RESOURCE_LOAD_ERROR",

  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Custom error class for SeoKit errors
 */
export class SeoKitError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SeoKitError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SeoKitError);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Error factory functions for common error scenarios
 */

export function createConfigMissingError(configPath: string): SeoKitError {
  return new SeoKitError(
    `Configuration file not found at ${configPath}\n\n` +
      `Run 'seokit init' to create a configuration file.`,
    ErrorCode.CONFIG_MISSING,
    500,
    { configPath }
  );
}

export function createConfigInvalidError(
  configPath: string,
  validationErrors: string[]
): SeoKitError {
  const errorList = validationErrors.map((err) => `  - ${err}`).join("\n");

  return new SeoKitError(
    `Invalid configuration in ${configPath}:\n\n${errorList}\n\n` +
      `Please check your configuration file and fix the errors above.`,
    ErrorCode.CONFIG_INVALID,
    500,
    { configPath, validationErrors }
  );
}

export function createFontFileNotFoundError(
  missingFonts: Array<{ name: string; path: string }>
): SeoKitError {
  const fontList = missingFonts
    .map((f) => `  - ${f.name}: ${f.path}`)
    .join("\n");

  return new SeoKitError(
    `Font files not found:\n\n${fontList}\n\n` +
      `Please check the font paths in your configuration file.`,
    ErrorCode.FONT_FILE_NOT_FOUND,
    500,
    { missingFonts }
  );
}

export function createTemplateUnreachableError(
  htmlSourceUrl: string,
  originalError?: Error
): SeoKitError {
  return new SeoKitError(
    `❌ Template Endpoint Unreachable\n\n` +
      `Could not connect to ${htmlSourceUrl}\n\n` +
      `Make sure your development server is running:\n` +
      `  npm run dev\n\n` +
      `If using a different port, update htmlSourceUrl in seokit.config.ts`,
    ErrorCode.TEMPLATE_UNREACHABLE,
    502,
    { htmlSourceUrl, originalError: originalError?.message }
  );
}

export function createTemplateTimeoutError(
  url: string,
  timeoutMs: number
): SeoKitError {
  return new SeoKitError(
    `Template Endpoint request timed out after ${
      timeoutMs / 1000
    } seconds\n\n` +
      `URL: ${url}\n\n` +
      `The Template Endpoint is taking too long to respond. Check:\n` +
      `  1. Your development server is running\n` +
      `  2. The template rendering is not hanging\n` +
      `  3. The htmlSourceUrl in seokit.config.ts is correct`,
    ErrorCode.TEMPLATE_TIMEOUT,
    504,
    { url, timeoutMs }
  );
}

export function createTemplateRenderFailedError(
  url: string,
  status: number,
  statusText: string
): SeoKitError {
  return new SeoKitError(
    `Template Endpoint returned ${status} ${statusText}\n\n` +
      `URL: ${url}\n\n` +
      `Make sure your development server is running and the Template Endpoint is accessible.`,
    ErrorCode.TEMPLATE_RENDER_FAILED,
    502,
    { url, status, statusText }
  );
}

export function createTemplateInvalidResponseError(
  url: string,
  reason: string
): SeoKitError {
  return new SeoKitError(
    `Template Endpoint returned invalid response\n\n` +
      `URL: ${url}\n` +
      `Reason: ${reason}\n\n` +
      `Make sure the Template Endpoint returns a JSON response with 'html' and 'css' properties.`,
    ErrorCode.TEMPLATE_INVALID_RESPONSE,
    502,
    { url, reason }
  );
}

export function createSatoriConversionError(originalError: Error): SeoKitError {
  return new SeoKitError(
    `Failed to convert HTML to SVG using Satori\n\n` +
      `Error: ${originalError.message}\n\n` +
      `This may be caused by:\n` +
      `  1. Unsupported CSS properties in your template\n` +
      `  2. Invalid HTML structure\n` +
      `  3. Missing or invalid font configuration\n\n` +
      `Check the Satori documentation for supported CSS properties.`,
    ErrorCode.SATORI_CONVERSION_FAILED,
    500,
    { originalError: originalError.message }
  );
}

export function createSharpConversionError(originalError: Error): SeoKitError {
  return new SeoKitError(
    `Failed to convert SVG to PNG using Sharp\n\n` +
      `Error: ${originalError.message}\n\n` +
      `This is usually caused by invalid SVG output from Satori.`,
    ErrorCode.SHARP_CONVERSION_FAILED,
    500,
    { originalError: originalError.message }
  );
}

export function createFontLoadError(
  fontPath: string,
  originalError: Error
): SeoKitError {
  return new SeoKitError(
    `Failed to load font file: ${fontPath}\n\n` +
      `Error: ${originalError.message}\n\n` +
      `Make sure the font file exists and is readable.`,
    ErrorCode.FONT_LOAD_FAILED,
    500,
    { fontPath, originalError: originalError.message }
  );
}

export function createPortInUseError(port: number): SeoKitError {
  return new SeoKitError(
    `Port ${port} is already in use.\n\n` +
      `Another process is using port ${port}. Please either:\n` +
      `  1. Stop the other process using port ${port}\n` +
      `  2. Change the port in your seokit.config.ts:\n\n` +
      `     server: {\n` +
      `       port: 7358  // or another available port\n` +
      `     }\n`,
    ErrorCode.PORT_IN_USE,
    500,
    { port }
  );
}

export function createPortAccessDeniedError(port: number): SeoKitError {
  return new SeoKitError(
    `Permission denied to bind to port ${port}.\n\n` +
      `Ports below 1024 require administrator privileges.\n` +
      `Please use a port number above 1024 in your seokit.config.ts.`,
    ErrorCode.PORT_ACCESS_DENIED,
    500,
    { port }
  );
}

export function createImageGenerationError(originalError: Error): SeoKitError {
  return new SeoKitError(
    `Image generation failed\n\n` + `Error: ${originalError.message}`,
    ErrorCode.IMAGE_GENERATION_FAILED,
    500,
    { originalError: originalError.message }
  );
}

export function createBrowserLaunchError(originalError: Error): SeoKitError {
  return new SeoKitError(
    `Failed to launch browser\n\n` +
      `Error: ${originalError.message}\n\n` +
      `Troubleshooting:\n` +
      `  1. Make sure Chromium dependencies are installed\n` +
      `  2. Check if running in a Docker container (may need --no-sandbox)\n` +
      `  3. Verify sufficient memory is available\n` +
      `  4. Check system logs for more details`,
    ErrorCode.BROWSER_LAUNCH_ERROR,
    500,
    { originalError: originalError.message }
  );
}

export function createBrowserCrashedError(originalError?: Error): SeoKitError {
  return new SeoKitError(
    `Browser crashed unexpectedly\n\n` +
      `${originalError ? `Error: ${originalError.message}\n\n` : ""}` +
      `The browser will attempt to restart automatically.`,
    ErrorCode.BROWSER_CRASHED,
    503,
    { originalError: originalError?.message }
  );
}

export function createBrowserTimeoutError(timeoutMs: number): SeoKitError {
  return new SeoKitError(
    `Browser operation timed out after ${timeoutMs / 1000} seconds\n\n` +
      `The browser may be unresponsive or the operation is taking too long.\n` +
      `Consider increasing the timeout in your configuration.`,
    ErrorCode.BROWSER_TIMEOUT,
    504,
    { timeoutMs }
  );
}

export function createPagePoolExhaustedError(
  poolSize: number,
  waitingRequests: number
): SeoKitError {
  return new SeoKitError(
    `Page pool exhausted\n\n` +
      `All ${poolSize} pages are currently in use with ${waitingRequests} requests waiting.\n\n` +
      `Consider:\n` +
      `  1. Increasing the pool size in your configuration\n` +
      `  2. Optimizing template rendering performance\n` +
      `  3. Implementing request throttling`,
    ErrorCode.PAGE_POOL_EXHAUSTED,
    503,
    { poolSize, waitingRequests }
  );
}

export function createPageAcquisitionTimeoutError(
  maxWaitTime: number
): SeoKitError {
  return new SeoKitError(
    `Page acquisition timed out after ${maxWaitTime / 1000} seconds\n\n` +
      `No pages became available within the timeout period.\n` +
      `The page pool may be exhausted or pages are taking too long to render.`,
    ErrorCode.PAGE_ACQUISITION_TIMEOUT,
    504,
    { maxWaitTime }
  );
}

export function createRenderError(
  message: string,
  consoleErrors?: string[]
): SeoKitError {
  const errorList = consoleErrors?.length
    ? `\n\nConsole errors:\n${consoleErrors.map((e) => `  - ${e}`).join("\n")}`
    : "";

  return new SeoKitError(
    `Render error: ${message}${errorList}`,
    ErrorCode.RENDER_ERROR,
    500,
    { consoleErrors }
  );
}

export function createResourceLoadError(
  failedResources: string[]
): SeoKitError {
  const resourceList = failedResources.map((url) => `  - ${url}`).join("\n");

  return new SeoKitError(
    `Failed to load resources:\n\n${resourceList}\n\n` +
      `Make sure all images and resources in your template are accessible.`,
    ErrorCode.RESOURCE_LOAD_ERROR,
    500,
    { failedResources }
  );
}

/**
 * Check if an error is a SeoKitError
 */
export function isSeoKitError(error: unknown): error is SeoKitError {
  return error instanceof SeoKitError;
}

/**
 * Convert any error to a SeoKitError
 */
export function toSeoKitError(error: unknown): SeoKitError {
  if (isSeoKitError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new SeoKitError(error.message, ErrorCode.UNKNOWN_ERROR, 500, {
      originalError: error.message,
    });
  }

  return new SeoKitError(String(error), ErrorCode.UNKNOWN_ERROR, 500);
}
