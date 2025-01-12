import { EventStoreDBClient, StreamingRead } from "@eventstore/db-client";
import { EventStoreDBContainer } from "./eventstoredb-container";

describe("EventStoreDBContainer", () => {
  jest.setTimeout(240_000);

  // startContainer {
  it("should execute write and read", async () => {
    const container = await new EventStoreDBContainer().start();

    const client = EventStoreDBClient.connectionString(container.getConnectionString());

    await client.appendToStream("User-1", [
      {
        contentType: "application/json",
        data: { email: "john@foo.local" },
        type: "UserCreated",
        id: "28ab6bca-d9ae-418b-a1af-eb65dd653c38",
        metadata: {
          someMetadata: "bar",
        },
      },
    ]);

    expect(await consumeSteamingRead(client.readStream("User-1"))).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({
          data: {
            email: "john@foo.local",
          },
          id: "28ab6bca-d9ae-418b-a1af-eb65dd653c38",
          isJson: true,
          metadata: {
            someMetadata: "bar",
          },
          revision: 0n,
          streamId: "User-1",
          type: "UserCreated",
        }),
      }),
    ]);

    await container.stop();
  });
  // }
});

async function consumeSteamingRead(read: StreamingRead<unknown>): Promise<unknown[]> {
  const events = [];

  for await (const event of read) {
    events.push(event);
  }

  return events;
}
