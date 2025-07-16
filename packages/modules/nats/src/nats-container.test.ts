import { jetstreamManager } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { NatsContainer } from "./nats-container";

const IMAGE = getImage(__dirname);

describe("NatsContainer", { timeout: 180_000 }, () => {
  // connect {
  it("should start, connect and close", async () => {
    const container = await new NatsContainer(IMAGE).start();

    // establish connection
    const nc = await connect(container.getConnectionOptions());
    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });
  // noCredentials {
  it("should start, connect and close when noCredentials is true", async () => {
    const container = await new NatsContainer(IMAGE).withCredentials(false).start();

    // establish connection
    const nc = await connect(container.getConnectionOptions());
    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });
  //}

  it("should start, connect and close using scratch image", async () => {
    const container = await new NatsContainer("nats:2.11").start();

    // establish connection
    const nc = await connect(container.getConnectionOptions());
    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });

  // pubsub {
  it("should subscribe and receive one published message", async () => {
    const SUBJECT = "HELLO";
    const PAYLOAD = "WORLD";

    const container = await new NatsContainer(IMAGE).start();
    const nc = await connect(container.getConnectionOptions());
    const TE = new TextEncoder();
    const TD = new TextDecoder();

    //----------------
    const sub = nc.subscribe(SUBJECT);
    (async () => {
      for await (const m of sub) {
        const actual = TD.decode(m.data);
        expect(actual).toEqual(PAYLOAD);
      }
    })().then();

    //----------------
    nc.publish(SUBJECT, TE.encode(PAYLOAD));

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
    const container = await new NatsContainer(IMAGE).withPass("1234").withUsername("George").start();

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
    const container = await new NatsContainer(IMAGE).withJetStream().start();

    const nc = await connect(container.getConnectionOptions());

    // ensure JetStream is enabled, otherwise this will throw an error
    await jetstreamManager(nc);

    // close the connection
    await nc.close();
    // check if the close was OK
    const err = await nc.closed();
    expect(err).toBe(undefined);

    await container.stop();
  });

  it("should fail without JetStream ", async () => {
    const container = await new NatsContainer(IMAGE).start();

    const nc = await connect(container.getConnectionOptions());

    // ensure JetStream is not enabled, as this will throw an error
    await expect(jetstreamManager(nc)).rejects.toThrow("jetstream is not enabled");

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
      const container = await new NatsContainer(IMAGE).withArg("version", "").start();
      await connect(container.getConnectionOptions());
    }

    await expect(outputVersionAndExit()).rejects.toThrow();
  });
});
