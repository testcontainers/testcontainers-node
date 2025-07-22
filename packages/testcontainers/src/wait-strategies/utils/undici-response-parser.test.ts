import { Readable } from "stream";
import { Dispatcher } from "undici";
import BodyReadable from "undici/types/readable";
import { undiciResponseToFetchResponse } from "./undici-response-parser";

test("converts undici response to fetch response", async () => {
  const responseData: Partial<Dispatcher.ResponseData> = {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: createBody('{"key":"value"}'),
  };

  const response = undiciResponseToFetchResponse(responseData as Dispatcher.ResponseData);

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/json");
  await expect(response.text()).resolves.toBe('{"key":"value"}');
});

test("handles empty headers", async () => {
  const responseData: Partial<Dispatcher.ResponseData> = {
    statusCode: 200,
    body: createBody(),
  };

  const response = undiciResponseToFetchResponse(responseData as Dispatcher.ResponseData);

  expect(response.headers).toEqual(new Headers());
});

test("handles a header array", async () => {
  const responseData: Partial<Dispatcher.ResponseData> = {
    statusCode: 200,
    headers: {
      "x-multiple-values": ["value1", "value2"],
    },
    body: createBody(),
  };

  const response = undiciResponseToFetchResponse(responseData as Dispatcher.ResponseData);

  expect(response.headers.get("x-multiple-values")).toBe("value1, value2");
});

test.each([204, 205, 304])("sets body to null for %i status code", async (statusCode) => {
  const responseData: Partial<Dispatcher.ResponseData> = {
    statusCode: statusCode,
    headers: { "content-type": "application/json" },
    body: createBody('{"key":"value"}'),
  };

  const response = undiciResponseToFetchResponse(responseData as Dispatcher.ResponseData);

  await expect(response.text()).resolves.toBe("");
});

function createBody(str: string = ""): BodyReadable {
  return Readable.from(Buffer.from(str, "utf-8")) as Dispatcher.ResponseData["body"];
}
