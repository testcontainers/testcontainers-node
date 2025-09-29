import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { RedpandaContainer } from "./redpanda-container";
import { assertMessageProducedAndConsumed } from "./test-helper";

const IMAGE = getImage(__dirname);

describe("RedpandaContainer", { timeout: 240_000 }, () => {
  it("should connect", async () => {
    // connectToKafka {
    await using container = await new RedpandaContainer(IMAGE).start();

    await assertMessageProducedAndConsumed(container);
    // }
  });

  it("should connect to schema registry", async () => {
    // connectToSchemaRegistry {
    await using container = await new RedpandaContainer(IMAGE).start();
    const schemaRegistryUrl = container.getSchemaRegistryAddress();

    const response = await fetch(`${schemaRegistryUrl}/subjects`, {
      method: "GET",
      headers: {
        "Content-Type": "application/vnd.schemaregistry.v1+json",
      },
    });

    expect(response.status).toBe(200);
    // }
  });

  it("should connect to admin", async () => {
    // connectToAdmin {
    await using container = await new RedpandaContainer(IMAGE).start();
    const adminUrl = `${container.getAdminAddress()}/v1`;

    const response = await fetch(adminUrl);

    expect(response.status).toBe(200);
    // }
  });

  it("should connect to rest proxy", async () => {
    // connectToRestProxy {
    await using container = await new RedpandaContainer(IMAGE).start();
    const restProxyUrl = `${container.getRestProxyAddress()}/topics`;

    const response = await fetch(restProxyUrl);

    expect(response.status).toBe(200);
    // }
  });
});
