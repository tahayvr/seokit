/**
 * Template Endpoint fetching functionality
 */

import {
  createTemplateUnreachableError,
  createTemplateTimeoutError,
  createTemplateRenderFailedError,
  createTemplateInvalidResponseError,
} from "./errors.js";
import { getLogger } from "./logger.js";

export interface TemplateEndpointResponse {
  html: string;
  css?: string;
}

/**
 * Fetch HTML and CSS from the Template Endpoint
 * @param htmlSourceUrl Base URL of the Template Endpoint
 * @param params Query parameters to pass to the template
 * @returns Template response with HTML and CSS
 */
export async function fetchTemplateHtml(
  htmlSourceUrl: string,
  params: URLSearchParams
): Promise<TemplateEndpointResponse> {
  const logger = getLogger();
  const url = `${htmlSourceUrl}?${params.toString()}`;
  const timeoutMs = 10000; // 10 second timeout

  // Log template request
  logger.logTemplateRequest(url, params);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw createTemplateRenderFailedError(
        url,
        response.status,
        response.statusText
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw createTemplateInvalidResponseError(
        url,
        `Invalid content type: ${contentType}. Expected: application/json`
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!data.html || typeof data.html !== "string") {
      throw createTemplateInvalidResponseError(
        url,
        `Response missing 'html' property or 'html' is not a string`
      );
    }

    return {
      html: data.html,
      css: typeof data.css === "string" ? data.css : "",
    };
  } catch (error) {
    if (error instanceof Error) {
      // Handle abort/timeout
      if (error.name === "AbortError") {
        throw createTemplateTimeoutError(url, timeoutMs);
      }

      // Handle network errors
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED")
      ) {
        throw createTemplateUnreachableError(htmlSourceUrl, error);
      }

      // Re-throw SeoKitErrors
      throw error;
    }

    throw createTemplateUnreachableError(htmlSourceUrl);
  }
}
