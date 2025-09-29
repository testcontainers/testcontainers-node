import { mockServerClient } from "mockserver-client";
import superagent from "superagent";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MockserverContainer } from "./mockserver-container";

const IMAGE = getImage(__dirname);

describe("MockserverContainer", { timeout: 240_000 }, () => {
  it("should start and accept mocks", async () => {
    // httpMockServer {
    await using container = await new MockserverContainer(IMAGE).start();

    const client = mockServerClient(container.getHost(), container.getMockserverPort());
    await client.mockAnyResponse({
      httpRequest: {
        method: "GET",
        path: "/foo",
      },
      httpResponse: {
        body: {
          string: "bar",
        },
        statusCode: 200,
      },
    });

    const response = await superagent.get(`${container.getUrl()}/foo`);

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("bar");
    // }
  });

  it("should return an https url", async () => {
    await using container = await new MockserverContainer(IMAGE).start();
    const secureUrl = container.getSecureUrl();
    expect(secureUrl.startsWith("https://")).to.equal(true, `${secureUrl} does not start with https://`);
  });

  it("should respond to https requests", async () => {
    // mockServerHttps {
    await using container = await new MockserverContainer(IMAGE).start();

    const client = mockServerClient(container.getHost(), container.getMockserverPort());
    await client.mockAnyResponse({
      httpRequest: {
        method: "GET",
        path: "/foo",
      },
      httpResponse: {
        body: {
          string: "bar",
        },
        statusCode: 200,
      },
    });

    const secureUrl = container.getSecureUrl();
    const response = await superagent.get(`${secureUrl}/foo`).disableTLSCerts();

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("bar");
    // }
  });
});
