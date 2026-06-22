import { Readable } from "stream";
import { Agent } from "undici";
import { RandomUuid } from "../common";
import { GenericContainer } from "../generic-container/generic-container";
import { checkContainerIsHealthy, checkContainerIsHealthyTls, stopStartingContainer } from "../utils/test-helper";
import { Wait } from "./wait";

// The Agent constructor is spied so we can assert how many insecure agents the
// HTTP wait strategy creates across retries. `request` falls through to the real
// implementation by default (used by the Docker-backed tests below) and is only
// overridden inside the agent-lifecycle tests.
vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return {
    ...actual,
    Agent: vi.fn(function (...args: ConstructorParameters<typeof actual.Agent>) {
      const agent = new actual.Agent(...args);
      agentInstances.push(agent);
      return agent;
    }),
    request: vi.fn(actual.request),
  };
});

let agentInstances: Agent[] = [];

describe("HttpWaitStrategy", { timeout: 180_000 }, () => {
  describe.sequential("agent lifecycle", () => {
    beforeEach(async () => {
      agentInstances = [];
      const { request } = await import("undici");
      const actual = await vi.importActual<typeof import("undici")>("undici");
      vi.mocked(Agent).mockClear();
      vi.mocked(request).mockClear();
      vi.mocked(request).mockImplementation(actual.request);
    });

    afterEach(() => {
      vi.doUnmock("../container-runtime");
    });

    function mockContainerRuntime() {
      const client = {
        info: { containerRuntime: { host: "localhost" } },
        container: { inspect: vi.fn() },
      };
      vi.doMock("../container-runtime", async (importOriginal) => {
        const actual = await importOriginal<typeof import("../container-runtime")>();
        return { ...actual, getContainerRuntimeClient: async () => client };
      });
    }

    it("should construct a single insecure agent across retries and dispose it on completion", async () => {
      const { request } = await import("undici");

      let attempts = 0;
      vi.mocked(request).mockImplementation(async () => {
        attempts++;
        // Fail the first few attempts so the retry loop runs multiple times,
        // then return a passing response.
        if (attempts < 3) {
          throw new Error("connection refused");
        }
        return {
          statusCode: 200,
          headers: {},
          body: Readable.from(["ok"]),
        } as unknown as Awaited<ReturnType<typeof request>>;
      });

      mockContainerRuntime();
      const { HttpWaitStrategy } = await import("./http-wait-strategy.js");

      const boundPorts = { getBinding: () => 12345 } as never;
      const container = { id: "container-id" } as never;

      const strategy = new HttpWaitStrategy("/health", 8443, {})
        .usingTls()
        .allowInsecure()
        .withReadTimeout(10)
        .withStartupTimeout(5000);

      await strategy.waitUntilReady(container, boundPorts);

      expect(attempts).toBeGreaterThan(1);
      // Only one Agent is constructed despite multiple retry attempts.
      expect(vi.mocked(Agent)).toHaveBeenCalledTimes(1);
      expect(agentInstances).toHaveLength(1);
      // The agent is disposed once the wait strategy finishes.
      expect(agentInstances[0].closed).toBe(true);
    });

    it("should never construct an agent when allowInsecure is not set", async () => {
      const { request } = await import("undici");

      vi.mocked(request).mockImplementation(
        async () =>
          ({
            statusCode: 200,
            headers: {},
            body: Readable.from(["ok"]),
          }) as unknown as Awaited<ReturnType<typeof request>>
      );

      mockContainerRuntime();
      const { HttpWaitStrategy } = await import("./http-wait-strategy.js");

      const boundPorts = { getBinding: () => 12345 } as never;
      const container = { id: "container-id" } as never;

      const strategy = new HttpWaitStrategy("/health", 8080, {}).withReadTimeout(10).withStartupTimeout(5000);

      await strategy.waitUntilReady(container, boundPorts);

      expect(vi.mocked(Agent)).not.toHaveBeenCalled();
      expect(agentInstances).toHaveLength(0);
    });
  });

  it("should wait for 200", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/hello-world", 8080))
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should wait for status code", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/unknown-path", 8080).forStatusCode(404))
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should timeout for mismatching status code", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(3000)
        .withWaitStrategy(Wait.forHttp("/unknown-path", 8080).forStatusCode(200))
        .start()
    ).rejects.toThrowError("URL /unknown-path not accessible after 3000ms");
  });

  it("should wait for status code matching", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(
        Wait.forHttp("/hello-world", 8080).forStatusCodeMatching(
          (statusCode) => statusCode === 404 || statusCode === 200
        )
      )
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should timeout for falsy status code matching", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(3000)
        .withWaitStrategy(Wait.forHttp("/hello-world", 8080).forStatusCodeMatching(() => false))
        .start()
    ).rejects.toThrowError("URL /hello-world not accessible after 3000ms");
  });

  it("should wait for response body predicate", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(
        Wait.forHttp("/hello-world", 8080).forResponsePredicate((response) => response === "hello-world")
      )
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should timeout for falsy response body predicate", async () => {
    await expect(() =>
      new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(3000)
        .withWaitStrategy(Wait.forHttp("/hello-world", 8080).forResponsePredicate(() => false))
        .start()
    ).rejects.toThrowError("URL /hello-world not accessible after 3000ms");
  });

  describe("when options.abortOnContainerExit is true", () => {
    it("should fail if container exited before waiting pass", async () => {
      const name = `container-name-${new RandomUuid().nextUuid()}`;
      const data = [1, 2, 3];
      const tail = 50;
      const echoCmd = data.map((i) => `echo ${i}`).join(" && ");
      const lastLogs = data.join("\n");
      const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(20000)
        .withEntrypoint(["/bin/sh", "-c", `${echoCmd} && sleep infinity`])
        .withWaitStrategy(Wait.forHttp("/hello-world", 8080, { abortOnContainerExit: true }))
        .withName(name);

      await expect(stopStartingContainer(container, name)).rejects.toThrowError(
        new Error(`Container exited during HTTP healthCheck, last ${tail} logs: ${lastLogs}`)
      );
    });

    it("should log only $tail logs if container exited before waiting pass", async () => {
      const name = `container-name-${new RandomUuid().nextUuid()}`;
      const tail = 50;
      const data = [...Array(tail + 5).keys()];
      const echoCmd = data.map((i) => `echo ${i}`).join(" && ");
      const lastLogs = data.slice(tail * -1).join("\n");
      const container = new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8080)
        .withStartupTimeout(20000)
        .withEntrypoint(["/bin/sh", "-c", `${echoCmd} && sleep infinity`])
        .withWaitStrategy(Wait.forHttp("/hello-world", 8080, { abortOnContainerExit: true }))
        .withName(name);

      await expect(stopStartingContainer(container, name)).rejects.toThrowError(
        new Error(`Container exited during HTTP healthCheck, last ${tail} logs: ${lastLogs}`)
      );
    });
  });

  it("should set method", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/hello-world-post", 8080).withMethod("POST"))
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should set headers", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/header-or-400/custom", 8080).withHeaders({ custom: "value" }))
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should set basic credentials", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/auth", 8080).withBasicCredentials("user", "pass"))
      .start();

    await checkContainerIsHealthy(container);
  });

  it("should set read timeout", async () => {
    await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/hello-world-delay", 8080).withReadTimeout(5000))
      .start();

    await checkContainerIsHealthy(container);
  });

  describe("should wait for TLS", () => {
    it("disallow self-signed certificates", async () => {
      await expect(() =>
        new GenericContainer("cristianrgreco/testcontainer:1.1.14")
          .withExposedPorts(8443)
          .withWaitStrategy(Wait.forHttp("/hello-world", 8443).usingTls())
          .withStartupTimeout(5_000)
          .start()
      ).rejects.toThrow();
    });

    it("allow self-signed certificates", async () => {
      await using container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
        .withExposedPorts(8443)
        .withWaitStrategy(Wait.forHttp("/hello-world", 8443).usingTls().allowInsecure())
        .start();

      await checkContainerIsHealthyTls(container);
    });
  });
});
