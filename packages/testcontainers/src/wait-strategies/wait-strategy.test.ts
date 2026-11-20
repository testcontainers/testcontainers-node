import type Dockerode from "dockerode";
import { AbstractWaitStrategy } from "./wait-strategy";

const { inspect } = vi.hoisted(() => ({ inspect: vi.fn() }));

vi.mock("../container-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../container-runtime")>()),
  getContainerRuntimeClient: async () => ({ container: { inspect } }),
}));

class TestWaitStrategy extends AbstractWaitStrategy {
  constructor(private readonly attempt: () => Promise<boolean>) {
    super();
  }

  public async waitUntilReady(container: Dockerode.Container): Promise<void> {
    await this.retryUntil(
      container,
      10,
      this.attempt,
      (ready) => ready,
      () => new Error("Not ready")
    );
  }
}

const stubContainer = { id: "container-id" } as Dockerode.Container;

const inspectResult = (Status: string, ExitCode = 0) => ({ State: { Status, ExitCode } });

describe("AbstractWaitStrategy", { concurrent: false }, () => {
  it("fails as soon as the container has exited", async () => {
    inspect.mockResolvedValue(inspectResult("exited", 1));
    const attempt = vi.fn(async () => false);

    await expect(new TestWaitStrategy(attempt).waitUntilReady(stubContainer)).rejects.toThrowError(
      "Container exited with code 1"
    );
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("reports the exit when an attempt fails because the container has exited", async () => {
    inspect.mockResolvedValue(inspectResult("exited", 1));

    await expect(
      new TestWaitStrategy(() => Promise.reject(new Error("container is not running"))).waitUntilReady(stubContainer)
    ).rejects.toThrowError("Container exited with code 1");
  });

  it("rethrows the error of a failed attempt while the container is running", async () => {
    inspect.mockResolvedValue(inspectResult("running"));

    await expect(
      new TestWaitStrategy(() => Promise.reject(new Error("attempt failed"))).waitUntilReady(stubContainer)
    ).rejects.toThrowError("attempt failed");
  });

  it("keeps waiting while the container is restarting", async () => {
    inspect.mockResolvedValueOnce(inspectResult("restarting")).mockResolvedValueOnce(inspectResult("running"));
    const attempt = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await new TestWaitStrategy(attempt).waitUntilReady(stubContainer);

    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("keeps waiting after the container has exited when abortOnContainerExit is false", async () => {
    inspect.mockResolvedValue(inspectResult("exited", 1));

    await expect(
      new TestWaitStrategy(async () => false)
        .withAbortOnContainerExit(false)
        .withStartupTimeout(50)
        .waitUntilReady(stubContainer)
    ).rejects.toThrowError("Not ready");
    expect(inspect).not.toHaveBeenCalled();
  });
});
