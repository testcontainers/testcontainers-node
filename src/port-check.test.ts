import { log } from "./logger";
import { execContainer } from "./docker/functions/container/exec-container";
import Dockerode from "dockerode";
import { InternalPortCheck } from "./port-check";

jest.mock("./logger");
jest.mock("./docker/functions/container/exec-container");

const mockLogger = jest.mocked(log, true);
const mockExecContainer = jest.mocked(execContainer, true);

describe("PortCheck", () => {
  describe("InternalPortCheck", () => {
    let mockContainer: Dockerode.Container;
    let portCheck: InternalPortCheck;

    beforeEach(() => {
      jest.resetAllMocks();
      mockContainer = { id: "containerId" } as Dockerode.Container;
      portCheck = new InternalPortCheck(mockContainer);
    });

    it("should return true when at least one command returns exit code 0", async () => {
      mockExecContainer
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "SUCCESS", exitCode: 0 }));

      const result = await portCheck.isBound(8080);

      expect(result).toBe(true);
    });

    it("should trace log unique error messages", async () => {
      mockExecContainer
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }));

      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result for container containerId exit code 1: ERROR 1"],
        ["Port check result for container containerId exit code 1: ERROR 2"],
      ]);
    });

    it("should trace log unique error messages across multiple invocations", async () => {
      mockExecContainer
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 1 }));

      await portCheck.isBound(8080);
      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result for container containerId exit code 1: ERROR 1"],
        ["Port check result for container containerId exit code 1: ERROR 2"],
      ]);
    });

    it("should not trace log error messages with empty output", async () => {
      mockExecContainer
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "", exitCode: 1 }));

      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result for container containerId exit code 1: ERROR 1"],
      ]);
    });

    it("should not trace log error messages where the shell is missing if another shell exists", async () => {
      mockExecContainer
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 1 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }));

      await portCheck.isBound(8080);

      expect(mockLogger.trace.mock.calls).toEqual([
        ["Port check result for container containerId exit code 1: ERROR 1"],
      ]);
    });

    it("should error log when the port-check will fail due to missing shells (distroless)", async () => {
      mockExecContainer
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 1", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }))
        .mockReturnValueOnce(Promise.resolve({ output: "ERROR 2", exitCode: 126 }));

      await portCheck.isBound(8080);

      expect(mockLogger.error.mock.calls).toEqual([
        [
          "The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy for container containerId",
        ],
      ]);
    });

    it("should error log the distroless image once", async () => {
      mockExecContainer
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
          "The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy for container containerId",
        ],
      ]);
    });
  });
});
