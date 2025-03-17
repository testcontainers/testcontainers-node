import { PubSub } from "@google-cloud/pubsub";
import { PubSubEmulatorContainer, StartedPubSubEmulatorContainer } from "./pubsub-emulator-container";

describe("PubSubEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    const pubsubEmulatorContainer = await new PubSubEmulatorContainer().start();

    await checkPubSub(pubsubEmulatorContainer);

    await pubsubEmulatorContainer.stop();
  });

  async function checkPubSub(pubsubEmulatorContainer: StartedPubSubEmulatorContainer) {
    expect(pubsubEmulatorContainer).toBeDefined();

    const pubSubClient = new PubSub({
      projectId: "test-project",
      apiEndpoint: pubsubEmulatorContainer.getEmulatorEndpoint(),
    });
    expect(pubSubClient).toBeDefined();

    const [createdTopic] = await pubSubClient.createTopic("test-topic");
    expect(createdTopic).toBeDefined();
    // Note: topic name format is projects/<projectId>/topics/<topicName>
    expect(createdTopic.name).toContain("test-topic");
  }
});
