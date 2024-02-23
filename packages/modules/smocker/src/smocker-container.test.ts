import { SmockerContainer } from "./smocker-container";
import axios from "axios";

describe("SmockerContainer", () => {
  jest.setTimeout(180_000);

  // connect {
  it("should create a mock and reply properly to that mock", async () => {
    const container = await new SmockerContainer().start();

    const mock = [
      {
        request: {
          method: "GET",
          path: "/test",
        },
        response: {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
          body: "this is the reply from the mock",
        },
      },
    ];
    const apiUri = container.getApiUri();
    await axios.post(apiUri + "mocks", JSON.stringify(mock), { headers: { "Content-Type": "application/json" } });

    const mockUri = container.getMockUri();
    const response = await axios.get(mockUri + "test");
    expect(response.status).toEqual(200);
    expect(response.data).toEqual("this is the reply from the mock");

    await container.stop();
  });
  // }
});
