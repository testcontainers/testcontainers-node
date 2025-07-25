import { PubSub } from "@google-cloud/pubsub";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { PubSubEmulatorContainer } from "./pubsub-emulator-container";

const IMAGE = getImage(__dirname);

describe("PubSubEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    // pubsubExample {
    await using container = await new PubSubEmulatorContainer(IMAGE).start();

    const pubSub = new PubSub({
      projectId: "test-project",
      apiEndpoint: container.getEmulatorEndpoint(),
    });

    const [createdTopic] = await pubSub.createTopic("test-topic");

    expect(createdTopic.name).toContain("test-topic");
    // }
  });
});
