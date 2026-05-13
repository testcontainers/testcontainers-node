import { ContainerInfo } from "dockerode";
import { ContainerRuntimeClient } from "../container-runtime";
import { DockerComposeEnvironment } from "./docker-compose-environment";

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

describe.sequential("DockerComposeEnvironment auto cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReaper = vi.fn();
  });

  it("should register the compose project with the reaper by default", async () => {
    mockClient = createMockContainerRuntimeClient();
    const addComposeProject = vi.fn();
    mockGetReaper.mockResolvedValue({
      sessionId: "session-id",
      containerId: "reaper-container-id",
      addComposeProject,
      addSession: vi.fn(),
    });

    await new DockerComposeEnvironment("/tmp", "docker-compose.yml").withProjectName("my-project").up();

    expect(mockGetReaper).toHaveBeenCalledWith(mockClient);
    expect(addComposeProject).toHaveBeenCalledWith("my-project");
  });

  it("should not register the compose project with the reaper when auto cleanup is disabled", async () => {
    mockClient = createMockContainerRuntimeClient();

    await new DockerComposeEnvironment("/tmp", "docker-compose.yml")
      .withProjectName("my-project")
      .withAutoCleanup(false)
      .up();

    expect(mockGetReaper).not.toHaveBeenCalled();
  });
});

function createMockContainerRuntimeClient(): ContainerRuntimeClient {
  return {
    compose: {
      down: vi.fn(),
      pull: vi.fn(),
      stop: vi.fn(),
      up: vi.fn(),
    },
    container: {
      list: vi.fn(async () => [] as ContainerInfo[]),
    },
    image: {},
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
    network: {},
  } as unknown as ContainerRuntimeClient;
}
