import { setTimeout } from "node:timers/promises";
import type { InspectResult, StartedTestContainer } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { RedpandaContainer } from "./redpanda-container";
import { assertMessageProducedAndConsumed } from "./test-helper";

const IMAGES = ["docker.io/redpandadata/redpanda:v26.1.18", getImage(__dirname)];

// Writes each copied file in two parts with a pause between them, as a busy Docker host can.
class SlowCopyRedpandaContainer extends RedpandaContainer {
  protected override async containerStarted(
    container: StartedTestContainer,
    inspectResult: InspectResult
  ): Promise<void> {
    const copyContentToContainer = container.copyContentToContainer.bind(container);
    container.copyContentToContainer = async (contentsToCopy) => {
      for (const { content, target, mode } of contentsToCopy) {
        const [firstLine] = String(content).split("\n", 1);
        await copyContentToContainer([{ content: `${firstLine}\n`, target, mode }]);
        await setTimeout(1_000);
        await copyContentToContainer([{ content, target, mode }]);
      }
    };
    await super.containerStarted(container, inspectResult);
  }
}

describe.each(IMAGES)("RedpandaContainer (%s)", { timeout: 240_000 }, (image) => {
  it("should connect", async () => {
    // connectToKafka {
    await using container = await new RedpandaContainer(image).start();

    await assertMessageProducedAndConsumed(container);
    // }
  });

  it("should connect when the config reaches the container late and in parts", async () => {
    await using container = await new SlowCopyRedpandaContainer(image).start();

    await assertMessageProducedAndConsumed(container);
  });

  it("should connect to schema registry", async () => {
    // connectToSchemaRegistry {
    await using container = await new RedpandaContainer(image).start();
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
    await using container = await new RedpandaContainer(image).start();
    const adminUrl = `${container.getAdminAddress()}/v1`;

    const response = await fetch(adminUrl);

    expect(response.status).toBe(200);
    // }
  });

  it("should connect to rest proxy", async () => {
    // connectToRestProxy {
    await using container = await new RedpandaContainer(image).start();
    const restProxyUrl = `${container.getRestProxyAddress()}/topics`;

    const response = await fetch(restProxyUrl);

    expect(response.status).toBe(200);
    // }
  });
});
