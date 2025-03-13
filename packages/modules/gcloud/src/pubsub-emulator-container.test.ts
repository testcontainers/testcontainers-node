import { PubSub } from "@google-cloud/pubsub";
import { Wait } from "testcontainers";
import { PubSubEmulatorContainer, StartedPubSubEmulatorContainer } from "./pubsub-emulator-container";

describe("PubSubEmulatorContainer", { timeout: 240_000 }, () => {
  it("should work using default version", async () => {
    const pubsubEmulatorContainer = await new PubSubEmulatorContainer().start();

    await checkPubSub(pubsubEmulatorContainer);

    await pubsubEmulatorContainer.stop();
  });

  it("should have default host-port flag", async () => {
    const pubsubEmulatorContainer = new PubSubEmulatorContainer();

    const flags = pubsubEmulatorContainer["flagsManager"].expandFlags();

    expect(flags.trim()).toEqual("--host-port=0.0.0.0:8085");
  });

  it("should be able to add flags after creating container", async () => {
    const pubsubEmulatorContainer = new PubSubEmulatorContainer();
    // clear all default flags
    pubsubEmulatorContainer["flagsManager"].clearFlags();

    // add some new flags
    const flags = pubsubEmulatorContainer.withFlag("host-port", "0.0.0.0:8081")["flagsManager"].expandFlags();

    // check new added flags exists
    expect(flags.trim()).toEqual("--host-port=0.0.0.0:8081");

    // check that container start command uses latest flags string
    const startedContainer = await pubsubEmulatorContainer
      .withWaitStrategy(Wait.forLogMessage(/.* listening on 8081/, 1))
      .start();
    await startedContainer.stop();
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
