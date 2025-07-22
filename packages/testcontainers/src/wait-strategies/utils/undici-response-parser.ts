import { Readable } from "stream";
import { Dispatcher } from "undici";

/**
 * Converts an undici response to a fetch response.
 * This is necessary because node's fetch does not support disabling SSL validation (https://github.com/orgs/nodejs/discussions/44038).
 *
 * @param undiciResponse The undici response to convert.
 * @returns The fetch response.
 */
export function undiciResponseToFetchResponse(undiciResponse: Dispatcher.ResponseData): Response {
  const headers = new Headers();
  if (undiciResponse.headers) {
    for (const [key, value] of Object.entries(undiciResponse.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v);
        }
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }
  }

  const status = undiciResponse.statusCode;
  const hasNullBody = status === 204 || status === 205 || status === 304;
  const responseBody = hasNullBody ? null : Readable.toWeb(undiciResponse.body);

  return new Response(responseBody, { status, headers });
}
