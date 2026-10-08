import { setTimeout } from "node:timers/promises";
import type { InspectResult, StartedTestContainer } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { RedpandaContainer } from "./redpanda-container";
import { assertMessageProducedAndConsumed } from "./test-helper";

const IMAGE = getImage(__dirname);

// Delays every copy into the container, as a busy Docker host does.
class SlowCopyRedpandaContainer extends RedpandaContainer {
  protected override async containerStarted(
    container: StartedTestContainer,
    inspectResult: InspectResult
  ): Promise<void> {
    const copyContentToContainer = container.copyContentToContainer.bind(container);
    container.copyContentToContainer = async (contentsToCopy) => {
      await setTimeout(1_000);
      return copyContentToContainer(contentsToCopy);
    };
    await super.containerStarted(container, inspectResult);
  }
}

describe("RedpandaContainer", { timeout: 240_000 }, () => {
  it("should connect", async () => {
    // connectToKafka {
    await using container = await new RedpandaContainer(IMAGE).start();

    await assertMessageProducedAndConsumed(container);
    // }
  });

  it("should connect when the config reaches the container late", async () => {
    await using container = await new SlowCopyRedpandaContainer(IMAGE).start();

    await assertMessageProducedAndConsumed(container);
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
