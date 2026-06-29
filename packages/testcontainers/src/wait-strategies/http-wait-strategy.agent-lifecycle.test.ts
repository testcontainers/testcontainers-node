import { Readable } from "stream";
import { Agent, request } from "undici";
import { HttpWaitStrategy } from "./http-wait-strategy";

// Hoisted so it is initialised before the mock factory below runs.
const { agentInstances } = vi.hoisted(() => ({ agentInstances: [] as import("undici").Agent[] }));

// Spy on the Agent constructor and stub `request` so the tests run without real HTTP.
vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return {
    ...actual,
    Agent: vi.fn(function (...args: ConstructorParameters<typeof actual.Agent>) {
      const agent = new actual.Agent(...args);
      agentInstances.push(agent);
      return agent;
    }),
    request: vi.fn(),
  };
});

vi.mock("../container-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../container-runtime")>();
  return {
    ...actual,
    getContainerRuntimeClient: async () => ({
      info: { containerRuntime: { host: "localhost" } },
      container: { inspect: vi.fn() },
    }),
  };
});

const boundPorts = { getBinding: () => 12345 } as never;
const container = { id: "container-id" } as never;

const passingResponse = () =>
  ({ statusCode: 200, headers: {}, body: Readable.from(["ok"]) }) as unknown as Awaited<ReturnType<typeof request>>;

// Sequential: the tests share the module-level Agent spy and instance list.
describe.sequential("HttpWaitStrategy insecure agent lifecycle", () => {
  beforeEach(() => {
    agentInstances.length = 0;
    vi.mocked(Agent).mockClear();
    vi.mocked(request).mockReset();
  });

  it("constructs a single insecure agent across retries and disposes it on completion", async () => {
    let attempts = 0;
    vi.mocked(request).mockImplementation(async () => {
      attempts++;
      // Fail the first attempts so the retry loop runs more than once.
      if (attempts < 3) {
        throw new Error("connection refused");
      }
      return passingResponse();
    });

    const strategy = new HttpWaitStrategy("/health", 8443, {})
      .usingTls()
      .allowInsecure()
      .withReadTimeout(10)
      .withStartupTimeout(5000);

    await strategy.waitUntilReady(container, boundPorts);

    expect(attempts).toBeGreaterThan(1);
    expect(vi.mocked(Agent)).toHaveBeenCalledTimes(1);
    expect(agentInstances).toHaveLength(1);
    expect(agentInstances[0].destroyed).toBe(true);
  });

  it("creates a separate insecure agent per wait so concurrent waits stay isolated", async () => {
    vi.mocked(request).mockImplementation(async () => passingResponse());

    const strategy = new HttpWaitStrategy("/health", 8443, {})
      .usingTls()
      .allowInsecure()
      .withReadTimeout(10)
      .withStartupTimeout(5000);

    await Promise.all([strategy.waitUntilReady(container, boundPorts), strategy.waitUntilReady(container, boundPorts)]);

    expect(vi.mocked(Agent)).toHaveBeenCalledTimes(2);
    expect(agentInstances).toHaveLength(2);
    expect(agentInstances.every((agent) => agent.destroyed)).toBe(true);
  });

  it("never constructs an agent when allowInsecure is not set", async () => {
    vi.mocked(request).mockImplementation(async () => passingResponse());

    const strategy = new HttpWaitStrategy("/health", 8080, {}).withReadTimeout(10).withStartupTimeout(5000);

    await strategy.waitUntilReady(container, boundPorts);

    expect(vi.mocked(Agent)).not.toHaveBeenCalled();
    expect(agentInstances).toHaveLength(0);
  });
});
