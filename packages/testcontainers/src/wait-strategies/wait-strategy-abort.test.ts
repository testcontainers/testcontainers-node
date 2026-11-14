import type { Container } from "dockerode";
import type { BoundPorts } from "../utils/bound-ports";
import { Wait } from "./wait";

const { signals } = vi.hoisted(() => ({ signals: [] as AbortSignal[] }));

vi.mock("../container-runtime", async (importOriginal) => {
  const pendingUntilAborted = (opts: { signal: AbortSignal }) =>
    new Promise((_, reject) => {
      signals.push(opts.signal);
      opts.signal.addEventListener("abort", () => reject(opts.signal.reason));
    });

  return {
    ...(await importOriginal<typeof import("../container-runtime")>()),
    getContainerRuntimeClient: async () => ({
      info: { containerRuntime: { host: "localhost" } },
      container: {
        inspect: (_container: Container, opts: { signal: AbortSignal }) => pendingUntilAborted(opts),
        exec: (_container: Container, _command: string[], opts: { signal: AbortSignal }) => pendingUntilAborted(opts),
      },
    }),
  };
});

const container = { id: "container-id" } as Container;
const boundPorts = {
  getBinding: () => 8080,
  iterator: () => [["8080/tcp", 8080]],
} as unknown as BoundPorts;

describe("Aborting Docker calls at the startup timeout", { concurrent: false }, () => {
  beforeEach(() => {
    signals.length = 0;
  });

  it.for([
    ["health check", Wait.forHealthCheck(), "Health check not healthy after 50ms"],
    [
      "shell command",
      Wait.forSuccessfulCommand("stat /tmp/app.lock"),
      `Shell command "stat /tmp/app.lock" not successful`,
    ],
    ["listening ports", Wait.forListeningPorts(), /Port 8080(\/tcp)? not bound after 50ms/],
    ["HTTP", Wait.forHttp("/", 8080, { abortOnContainerExit: true }), "URL / not accessible after 50ms"],
  ] as const)("should abort the Docker call of the %s wait strategy", async ([, waitStrategy, message]) => {
    await expect(waitStrategy.withStartupTimeout(50).waitUntilReady(container, boundPorts)).rejects.toThrow(message);

    expect(signals.length).toBeGreaterThan(0);
    await vi.waitFor(() => expect(signals.every((signal) => signal.aborted)).toBe(true));
  });
});
