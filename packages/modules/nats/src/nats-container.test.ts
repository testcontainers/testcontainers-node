import { connect, StringCodec } from "nats";
import { NatsContainer } from "./nats-container";

describe("NatsContainer", { timeout: 180_000 }, () => {
  // connect {
  it("should start, connect and close", async () => {
    const container = await new NatsContainer().start();

    // establish connection
    const nc = await connect(container.getConnectionOptions());
    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });
  // }

  // pubsub {
  it("should subscribe and receive one published message", async () => {
    const SUBJECT = "HELLO";
    const PAYLOAD = "WORLD";

    const container = await new NatsContainer().start();
    const nc = await connect(container.getConnectionOptions());
    const sc = StringCodec();

    //----------------
    const sub = nc.subscribe(SUBJECT);
    (async () => {
      for await (const m of sub) {
        const actual: string = sc.decode(m.data);
        expect(actual).toEqual(PAYLOAD);
      }
    })().then();

    //----------------
    nc.publish(SUBJECT, sc.encode(PAYLOAD));

    //----------------
    await nc.drain();
    await nc.close();
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });
  // }

  // credentials {
  it("should start with alternative username and password ", async () => {
    // set username and password like this
    const container = await new NatsContainer().withPass("1234").withUsername("George").start();

    const nc = await connect(container.getConnectionOptions());
    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });
  // }

  // jetstream {
  it("should start with JetStream ", async () => {
    // enable JetStream
    const container = await new NatsContainer().withJetStream().start();

    const nc = await connect(container.getConnectionOptions());

    // ensure JetStream is enabled, otherwise this will throw an error
    await nc.jetstream().jetstreamManager();

    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });

  it("should fail without JetStream ", async () => {
    const container = await new NatsContainer().start();

    const nc = await connect(container.getConnectionOptions());

    // ensure JetStream is not enabled, as this will throw an error
    await expect(nc.jetstream().jetstreamManager()).rejects.toThrow("503");

    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });
  // }

  it("should immediately end when started with version argument ", async () => {
    // for the complete list of available arguments see:
    // See Command Line Options section inside [NATS docker image documentation](https://hub.docker.com/_/nats)
    async function outputVersionAndExit() {
      const container = await new NatsContainer().withArg("version", "").start();
      await connect(container.getConnectionOptions());
    }

    await expect(outputVersionAndExit()).rejects.toThrow();
  });
});
