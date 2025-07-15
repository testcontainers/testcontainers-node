import { GenericContainer } from "../generic-container/generic-container";
import { RandomPortGenerator } from "../utils/port-generator";
import { createTestServer } from "../utils/test-helper";

describe.sequential("Port Forwarder reuse", { timeout: 180_000 }, () => {
  const portGen = new RandomPortGenerator();

  it("should expose additional ports", async () => {
    const { TestContainers: TC1 } = await import("../test-containers");
    const { PortForwarderInstance: PFI1 } = await import("../port-forwarder/port-forwarder");
    const port1 = await portGen.generatePort();
    const server1 = await createTestServer(port1);
    await TC1.exposeHostPorts(port1);
    const portForwarder1ContainerId = (await PFI1.getInstance()).getContainerId();

    vi.resetModules();
    const { TestContainers: TC2 } = await import("../test-containers");
    const { PortForwarderInstance: PFI2 } = await import("../port-forwarder/port-forwarder");
    const port2 = await portGen.generatePort();
    const server2 = await createTestServer(port2);
    await TC2.exposeHostPorts(port2);
    const portForwarder2ContainerId = (await PFI2.getInstance()).getContainerId();

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    expect(portForwarder1ContainerId).toEqual(portForwarder2ContainerId);
    const { output: output1 } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${port1}`]);
    expect(output1).toEqual(expect.stringContaining("hello world"));
    const { output: output2 } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${port2}`]);
    expect(output2).toEqual(expect.stringContaining("hello world"));

    await new Promise((resolve) => server1.close(resolve));
    await new Promise((resolve) => server2.close(resolve));
    await container.stop();
  });

  it("should reuse same ports", async () => {
    const port = await portGen.generatePort();
    const server = await createTestServer(port);

    const { TestContainers: TC1 } = await import("../test-containers");
    const { PortForwarderInstance: PFI1 } = await import("../port-forwarder/port-forwarder");
    await TC1.exposeHostPorts(port);
    const portForwarder1ContainerId = (await PFI1.getInstance()).getContainerId();

    vi.resetModules();
    const { TestContainers: TC2 } = await import("../test-containers");
    const { PortForwarderInstance: PFI2 } = await import("../port-forwarder/port-forwarder");
    await TC2.exposeHostPorts(port);
    const portForwarder2ContainerId = (await PFI2.getInstance()).getContainerId();

    const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();

    expect(portForwarder1ContainerId).toEqual(portForwarder2ContainerId);
    const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${port}`]);
    expect(output).toEqual(expect.stringContaining("hello world"));

    await new Promise((resolve) => server.close(resolve));
    await container.stop();
  });
});
