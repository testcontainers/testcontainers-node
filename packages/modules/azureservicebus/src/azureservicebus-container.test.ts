import { ServiceBusClient } from "@azure/service-bus";
import { GenericContainer, Wait } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { ServiceBusContainer } from "./azureservicebus-container";

const IMAGE = getImage(__dirname);

describe("Azure Service Bus", { timeout: 180_000 }, () => {
  it("should connect and queue a message", async () => {
    // serviceBusConnect {
    await using container = await new ServiceBusContainer(IMAGE).acceptLicense().start();

    const client = new ServiceBusClient(container.getConnectionString());
    const sender = client.createSender("queue.1");
    const receiver = client.createReceiver("queue.1");

    await sender.sendMessages({ body: "Hello, World!" });
    const res = await receiver.receiveMessages(1, { maxWaitTimeInMs: 5_000 });

    expect(res).toHaveLength(1);
    expect(res[0].body).toBe("Hello, World!");

    await receiver.close();
    await sender.close();
    await client.close();
    // }
  });

  it("should connect and queue a message using custom config", async () => {
    // serviceBusValidEmulatorConfig {
    const queueName = "custom-queue";
    const config = JSON.stringify({
      UserConfig: {
        Namespaces: [
          {
            Name: "sbemulatorns",
            Queues: [
              {
                Name: queueName,
                Properties: {
                  DeadLetteringOnMessageExpiration: false,
                  DefaultMessageTimeToLive: "PT1H",
                  DuplicateDetectionHistoryTimeWindow: "PT20S",
                  ForwardDeadLetteredMessagesTo: "",
                  ForwardTo: "",
                  LockDuration: "PT1M",
                  MaxDeliveryCount: 3,
                  RequiresDuplicateDetection: false,
                  RequiresSession: false,
                },
              },
            ],
            Topics: [],
          },
        ],
        Logging: {
          Type: "File",
        },
      },
    });

    await using container = await new ServiceBusContainer(IMAGE).acceptLicense().withConfig(config).start();

    const client = new ServiceBusClient(container.getConnectionString());
    const sender = client.createSender(queueName);
    const receiver = client.createReceiver(queueName);
    // }

    await sender.sendMessages({ body: "Hello, World!" });
    const res = await receiver.receiveMessages(1, { maxWaitTimeInMs: 5_000 });

    expect(res).toHaveLength(1);
    expect(res[0].body).toBe("Hello, World!");

    await receiver.close();
    await sender.close();
    await client.close();
  });

  it("should connect with a custom MSSQL container", async () => {
    // serviceBusCustomMssqlContainer {
    // You are responsible for configuring the SA password on
    // BOTH containers when using a custom MSSQL container.
    const customPassword = "MyC0mplexP@ssw0rd!";

    // @testcontainers/mssqlserver can be used as well
    const mssqlContainer = new GenericContainer("mcr.microsoft.com/mssql/server:2022-latest")
      .withEnvironment({
        ACCEPT_EULA: "Y",
        MSSQL_SA_PASSWORD: customPassword,
      })
      .withNetworkAliases("your-network-alias")
      .withWaitStrategy(Wait.forLogMessage(/.*Recovery is complete.*/, 1).withStartupTimeout(120_000));

    await using container = await new ServiceBusContainer(IMAGE)
      .acceptLicense()
      .withMssqlContainer(mssqlContainer)
      .withMssqlPassword(customPassword)
      .start();

    const client = new ServiceBusClient(container.getConnectionString());
    // }

    const sender = client.createSender("queue.1");
    const receiver = client.createReceiver("queue.1");

    await sender.sendMessages({ body: "Hello, World!" });
    const res = await receiver.receiveMessages(1, { maxWaitTimeInMs: 5_000 });

    expect(res).toHaveLength(1);
    expect(res[0].body).toBe("Hello, World!");

    await receiver.close();
    await sender.close();
    await client.close();
  });

  it("should connect containers to the same network", async () => {
    await using serviceBusContainer = await new ServiceBusContainer(IMAGE).acceptLicense().start();

    const servicebusNetworks = serviceBusContainer.getNetworkNames();
    const mssqlNetworks = serviceBusContainer.getMssqlContainer().getNetworkNames();

    expect(servicebusNetworks).toHaveLength(1);
    expect(mssqlNetworks).toEqual(expect.arrayContaining(servicebusNetworks));
  });
});
