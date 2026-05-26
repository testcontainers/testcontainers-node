import { mockServerClient } from "mockserver-client";
import superagent from "superagent";
import { MockserverContainer } from "./mockserver-container";

const IMAGE = "mockserver/mockserver:5.15.0";

describe("MockserverContainer 5", { timeout: 240_000 }, () => {
  it("should start and accept mocks", async () => {
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
  });
});
