import { Container } from "dockerode";
import { log } from "../../common";
import { ContainerRuntimeClient } from "../../container-runtime";
import { InternalPortCheck } from "./port-check";

vi.mock("../../common");
const mockLogger = vi.mocked(log);

const mockContainerExec = vi.fn();
vi.mock("../../container-runtime", () => {
  return {
    ContainerRuntimeClient: function () {
      return {
        container: {
          exec: () => mockContainerExec(),
        },
      };
    },
  };
});

describe("PortCheck", () => {
  describe("InternalPortCheck", () => {
    let client: ContainerRuntimeClient;
    let mockContainer: Container;
    let portCheck: InternalPortCheck;

    beforeEach(async () => {
      mockContainer = { id: "containerId" } as Container;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      client = new ContainerRuntimeClient();
      portCheck = new InternalPortCheck(client, mockContainer);

      // Make sure logging is enabled to capture all logs
      mockLogger.enabled.mockImplementation(() => true);
    });

    it("should return true when at least one command returns exit code 0", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "SUCCESS", exitCode: 0 }));

      const result = await portCheck.isBound(8080);

      expect(result).toBe(true);
    });

    it("should trace log unique error messages", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }));

      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result exit code 1: ERROR 1", { containerId: "containerId" }],
        ["Port check result exit code 1: ERROR 2", { containerId: "containerId" }],
      ]);
    });

    it("should trace log unique error messages across multiple invocations", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }));

      await portCheck.isBound(8080);
      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result exit code 1: ERROR 1", { containerId: "containerId" }],
        ["Port check result exit code 1: ERROR 2", { containerId: "containerId" }],
      ]);
    });

    it("should not trace log error messages with empty output", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "", exitCode: 1 }));

      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result exit code 1: ERROR 1", { containerId: "containerId" }],
      ]);
    });

    it("should not trace log error messages where the shell is missing if another shell exists", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }));

      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result exit code 1: ERROR 1", { containerId: "containerId" }],
      ]);
    });

    it("should error log when the port-check will fail due to missing shells (distroless)", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }));

      await portCheck.isBound(8080);

      expect(mockLogger.error.mock.calls).toEqual([
        [
          "The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy",
          { containerId: "containerId" },
        ],
      ]);
    });

    it("should error log the distroless image once", async () => {
      mockContainerExec
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }));

      await portCheck.isBound(8080);
      await portCheck.isBound(8080);

      expect(mockLogger.error.mock.calls).toEqual([
        [
          "The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy",
          { containerId: "containerId" },
        ],
      ]);
    });
  });
});
