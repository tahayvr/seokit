/**
 * CLI error formatting utilities
 * Provides user-friendly, colored error messages for the CLI
 */

import { isSeoKitError, ErrorCode, type SeoKitError } from "./errors.js";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

/**
 * Format text with color
 */
function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Format an error box with title and message
 */
function formatErrorBox(title: string, message: string): string {
  const lines = message.split("\n");
  const maxLength = Math.max(title.length, ...lines.map((line) => line.length));
  const border = "─".repeat(Math.min(maxLength + 4, 80));

  return [
    "",
    colorize(`┌${border}┐`, "red"),
    colorize(`│ ${colorize(title, "bold")}`, "red"),
    colorize(`├${border}┤`, "red"),
    ...lines.map((line) => colorize(`│ ${line}`, "red")),
    colorize(`└${border}┘`, "red"),
    "",
  ].join("\n");
}

/**
 * Format a section with title and content
 */
function formatSection(title: string, content: string): string {
  return ["", colorize(title, "bold"), content].join("\n");
}

/**
 * Format actionable steps
 */
function formatSteps(steps: string[]): string {
  return steps
    .map((step, index) => `  ${colorize(`${index + 1}.`, "cyan")} ${step}`)
    .join("\n");
}

/**
 * Format a code example
 */
function formatCode(code: string): string {
  return code
    .split("\n")
    .map((line) => `  ${colorize(line, "gray")}`)
    .join("\n");
}

/**
 * Format a file path
 */
function formatPath(path: string): string {
  return colorize(path, "cyan");
}

/**
 * Format a URL
 */
function formatUrl(url: string): string {
  return colorize(url, "blue");
}

/**
 * Format error messages based on error code
 */
export function formatCliError(error: unknown): string {
  if (!isSeoKitError(error)) {
    // Handle generic errors
    if (error instanceof Error) {
      return formatErrorBox("Error", error.message);
    }
    return formatErrorBox("Unknown Error", String(error));
  }

  const seoKitError = error as SeoKitError;

  switch (seoKitError.code) {
    case ErrorCode.CONFIG_MISSING:
      return formatConfigMissingError(seoKitError);

    case ErrorCode.CONFIG_INVALID:
      return formatConfigInvalidError(seoKitError);

    case ErrorCode.FONT_FILE_NOT_FOUND:
      return formatFontFileNotFoundError(seoKitError);

    case ErrorCode.TEMPLATE_UNREACHABLE:
      return formatTemplateUnreachableError(seoKitError);

    case ErrorCode.TEMPLATE_TIMEOUT:
      return formatTemplateTimeoutError(seoKitError);

    case ErrorCode.PORT_IN_USE:
      return formatPortInUseError(seoKitError);

    case ErrorCode.PORT_ACCESS_DENIED:
      return formatPortAccessDeniedError(seoKitError);

    default:
      return formatGenericError(seoKitError);
  }
}

function formatConfigMissingError(error: SeoKitError): string {
  const configPath = error.context?.configPath as string;

  return [
    formatErrorBox("❌ Configuration File Not Found", ""),
    `SeoKit could not find a configuration file at:`,
    `  ${formatPath(configPath)}`,
    formatSection(
      "To fix this:",
      formatSteps([
        "Run the init command to create a configuration file:",
        "",
        "  " + colorize("npx seokit init", "cyan"),
      ])
    ),
  ].join("\n");
}

function formatConfigInvalidError(error: SeoKitError): string {
  const configPath = error.context?.configPath as string;
  const validationErrors = error.context?.validationErrors as string[];

  return [
    formatErrorBox("❌ Invalid Configuration", ""),
    `Configuration file has validation errors:`,
    `  ${formatPath(configPath)}`,
    "",
    colorize("Validation Errors:", "bold"),
    ...validationErrors.map((err) => `  ${colorize("•", "red")} ${err}`),
    formatSection(
      "To fix this:",
      formatSteps([
        "Open your configuration file and fix the errors listed above",
        "Make sure all required fields are present and have valid values",
        "Check the documentation for configuration options",
      ])
    ),
  ].join("\n");
}

function formatFontFileNotFoundError(error: SeoKitError): string {
  const missingFonts = error.context?.missingFonts as Array<{
    name: string;
    path: string;
  }>;

  return [
    formatErrorBox("❌ Font Files Not Found", ""),
    `The following font files could not be found:`,
    "",
    ...missingFonts.map(
      (font) =>
        `  ${colorize("•", "red")} ${font.name}: ${formatPath(font.path)}`
    ),
    formatSection(
      "To fix this:",
      formatSteps([
        "Check that the font files exist at the specified paths",
        "Update the font paths in your seokit.config.ts",
        "Make sure the paths are relative to your project root",
      ])
    ),
    formatSection(
      "Example configuration:",
      formatCode(`fonts: [
  {
    name: 'Inter',
    path: './fonts/Inter-Regular.ttf',
    weight: 400,
  },
]`)
    ),
  ].join("\n");
}

function formatTemplateUnreachableError(error: SeoKitError): string {
  const htmlSourceUrl = error.context?.htmlSourceUrl as string;

  return [
    formatErrorBox("❌ Template Endpoint Unreachable", ""),
    `Could not connect to the Template Endpoint:`,
    `  ${formatUrl(htmlSourceUrl)}`,
    formatSection(
      "To fix this:",
      formatSteps([
        "Make sure your development server is running:",
        "",
        "  " + colorize("npm run dev", "cyan"),
        "",
        "If using a different port, update htmlSourceUrl in seokit.config.ts",
        "Check that your firewall is not blocking the connection",
      ])
    ),
  ].join("\n");
}

function formatTemplateTimeoutError(error: SeoKitError): string {
  const url = error.context?.url as string;
  const timeoutMs = error.context?.timeoutMs as number;

  return [
    formatErrorBox("❌ Template Endpoint Timeout", ""),
    `The Template Endpoint took too long to respond (>${timeoutMs / 1000}s):`,
    `  ${formatUrl(url)}`,
    formatSection(
      "Possible causes:",
      formatSteps([
        "Your development server is not running",
        "The template rendering is hanging or taking too long",
        "The htmlSourceUrl in seokit.config.ts is incorrect",
        "Network connectivity issues",
      ])
    ),
    formatSection(
      "To fix this:",
      formatSteps([
        "Check that your development server is running",
        "Review your template for performance issues",
        "Verify the htmlSourceUrl in your configuration",
      ])
    ),
  ].join("\n");
}

function formatPortInUseError(error: SeoKitError): string {
  const port = error.context?.port as number;

  return [
    formatErrorBox("❌ Port Already In Use", ""),
    `Port ${colorize(
      String(port),
      "cyan"
    )} is already being used by another process.`,
    formatSection(
      "To fix this:",
      formatSteps([
        `Stop the other process using port ${port}`,
        "Or change the port in your seokit.config.ts:",
      ])
    ),
    formatSection(
      "Example configuration:",
      formatCode(`server: {
  port: 7358,  // or another available port
}`)
    ),
  ].join("\n");
}

function formatPortAccessDeniedError(error: SeoKitError): string {
  const port = error.context?.port as number;

  return [
    formatErrorBox("❌ Port Access Denied", ""),
    `Permission denied to bind to port ${colorize(String(port), "cyan")}.`,
    "",
    colorize("Note:", "yellow") +
      " Ports below 1024 require administrator privileges.",
    formatSection(
      "To fix this:",
      formatSteps([
        "Use a port number above 1024 in your seokit.config.ts",
        "Or run the command with administrator privileges (not recommended)",
      ])
    ),
    formatSection(
      "Example configuration:",
      formatCode(`server: {
  port: 7357,  // ports above 1024 don't require admin
}`)
    ),
  ].join("\n");
}

function formatGenericError(error: SeoKitError): string {
  return [
    formatErrorBox(`❌ ${error.code}`, ""),
    error.message,
    error.context
      ? [
          "",
          colorize("Additional context:", "bold"),
          formatCode(JSON.stringify(error.context, null, 2)),
        ].join("\n")
      : "",
  ].join("\n");
}

/**
 * Print formatted error to console and exit
 */
export function handleCliError(error: unknown): never {
  const formattedError = formatCliError(error);
  console.error(formattedError);
  process.exit(1);
}
