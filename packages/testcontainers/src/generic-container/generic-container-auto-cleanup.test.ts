import { Container, ContainerCreateOptions, ContainerInspectInfo } from "dockerode";
import { Readable } from "stream";
import { ContainerRuntimeClient } from "../container-runtime";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { WaitStrategy } from "../wait-strategies/wait-strategy";
import { GenericContainer } from "./generic-container";

let mockClient: ContainerRuntimeClient;
let mockGetReaper = vi.fn();

vi.mock("../container-runtime", async () => ({
  ...(await vi.importActual("../container-runtime")),
  getContainerRuntimeClient: vi.fn(async () => mockClient),
}));

vi.mock("../reaper/reaper", async () => ({
  ...(await vi.importActual("../reaper/reaper")),
  getReaper: vi.fn(async (client: ContainerRuntimeClient) => await mockGetReaper(client)),
}));

describe.sequential("GenericContainer auto cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReaper = vi.fn();
  });

  it("should register the container with the reaper by default", async () => {
    const { client, inspectResult } = createMockContainerRuntimeClient();
    mockClient = client;
    mockGetReaper.mockResolvedValue({
      sessionId: "session-id",
      containerId: "reaper-container-id",
      addComposeProject: vi.fn(),
      addSession: vi.fn(),
    });

    const container = await new GenericContainer("alpine").withWaitStrategy(createNoopWaitStrategy()).start();

    expect(mockGetReaper).toHaveBeenCalledWith(client);
    expect(container.getLabels()[LABEL_TESTCONTAINERS_SESSION_ID]).toBe("session-id");
    expect(inspectResult.Config.Labels[LABEL_TESTCONTAINERS_SESSION_ID]).toBe("session-id");
  });

  it("should not register the container with the reaper when auto cleanup is disabled", async () => {
    const { client, inspectResult } = createMockContainerRuntimeClient();
    mockClient = client;

    const container = await new GenericContainer("alpine")
      .withAutoCleanup(false)
      .withWaitStrategy(createNoopWaitStrategy())
      .start();

    expect(mockGetReaper).not.toHaveBeenCalled();
    expect(container.getLabels()[LABEL_TESTCONTAINERS_SESSION_ID]).toBeUndefined();
    expect(inspectResult.Config.Labels[LABEL_TESTCONTAINERS_SESSION_ID]).toBeUndefined();
  });
});

function createMockContainerRuntimeClient(): {
  client: ContainerRuntimeClient;
  inspectResult: ContainerInspectInfo;
} {
  const inspectResult = {
    Config: {
      Hostname: "mock-hostname",
      Labels: {},
    },
    HostConfig: {
      PortBindings: {},
    },
    Name: "/mock-container",
    NetworkSettings: {
      Networks: {},
      Ports: {},
    },
    State: {
      FinishedAt: "0001-01-01T00:00:00Z",
      Running: true,
      StartedAt: new Date().toISOString(),
      Status: "running",
    },
  } as ContainerInspectInfo;

  const container = {
    id: "mock-container-id",
  } as Container;

  const client = {
    compose: {},
    container: {
      attach: vi.fn(),
      commit: vi.fn(),
      connectToNetwork: vi.fn(),
      create: vi.fn(async (opts: ContainerCreateOptions) => {
        inspectResult.Config.Labels = opts.Labels ?? {};
        return container;
      }),
      dockerode: {} as never,
      events: vi.fn(),
      exec: vi.fn(),
      fetchArchive: vi.fn(),
      fetchByLabel: vi.fn(),
      getById: vi.fn(),
      inspect: vi.fn(async () => inspectResult),
      list: vi.fn(),
      logs: vi.fn(async () => Readable.from([])),
      putArchive: vi.fn(),
      remove: vi.fn(),
      restart: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    },
    image: {
      pull: vi.fn(),
    },
    info: {
      containerRuntime: {
        host: "localhost",
        hostIps: [{ address: "127.0.0.1", family: 4 }],
      },
      node: {
        architecture: "x64",
        platform: "linux",
        version: process.version,
      },
    },
    network: {
      getById: vi.fn(),
    },
  } as unknown as ContainerRuntimeClient;

  return { client, inspectResult };
}

function createNoopWaitStrategy(): WaitStrategy {
  return {
    waitUntilReady: vi.fn(async () => undefined),
    withStartupTimeout: vi.fn().mockReturnThis(),
  } as unknown as WaitStrategy;
}
