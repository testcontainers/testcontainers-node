import { mockServerClient } from "mockserver-client";
import superagent from "superagent";
import { MockserverContainer } from "./mockserver-container";

describe("MockserverContainer", { timeout: 240_000 }, () => {
  // startContainer {
  it("should start and accept mocks", async () => {
    const container = await new MockserverContainer().start();
    const client = mockServerClient(container.getHost(), container.getMockserverPort());
    const url = container.getUrl();

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

    const response = await superagent.get(`${url}/foo`);

    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("bar");
  });
  // }
});
