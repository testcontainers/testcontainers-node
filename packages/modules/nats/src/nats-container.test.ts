import { jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { NatsContainer } from "./nats-container";

const IMAGES = ["nats:2.14.7-alpine", getImage(__dirname)];

describe.each(IMAGES)("NatsContainer (%s)", { timeout: 180_000 }, (image) => {
  it("should subscribe and receive one published message", async () => {
    // natsPubsub {
    const SUBJECT = "HELLO";
    const PAYLOAD = "WORLD";
    const TE = new TextEncoder();
    const TD = new TextDecoder();

    await using container = await new NatsContainer(image).start();
    const nc = await connect(container.getConnectionOptions());

    const sub = nc.subscribe(SUBJECT);

    const received = (async () => {
      const messages: string[] = [];
      for await (const m of sub) {
        messages.push(TD.decode(m.data));
      }
      return messages;
    })();

    nc.publish(SUBJECT, TE.encode(PAYLOAD));

    await nc.drain();
    expect(await received).toEqual([PAYLOAD]);
    await nc.close();
    // }
  });

  it("should start with alternative username and password ", async () => {
    // natsCredentials {
    await using container = await new NatsContainer(image).withUsername("George").withPass("1234").start();
    // }

    const nc = await connect(container.getConnectionOptions());

    await nc.close();
    const err = await nc.closed();
    expect(err).toBe(undefined);
  });

  it("should start with JetStream ", async () => {
    // natsJetstream {
    await using container = await new NatsContainer(image).withJetStream().start();
    // }

    const nc = await connect(container.getConnectionOptions());
    await jetstreamManager(nc);

    await nc.close();
    const err = await nc.closed();
    expect(err).toBe(undefined);
  });

  it("should fail without JetStream ", async () => {
    await using container = await new NatsContainer(image).start();

    const nc = await connect(container.getConnectionOptions());

    // ensure JetStream is not enabled, as this will throw an error
    await expect(jetstreamManager(nc)).rejects.toThrow("jetstream is not enabled");

    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);
  });
  // }

  it("should immediately end when started with version argument ", async () => {
    // for the complete list of available arguments see:
    // See Command Line Options section inside [NATS docker image documentation](https://hub.docker.com/_/nats)
    async function outputVersionAndExit() {
      await using container = await new NatsContainer(image).withArg("version", "").start();
      await connect(container.getConnectionOptions());
    }

    await expect(outputVersionAndExit()).rejects.toThrow();
  });
});
