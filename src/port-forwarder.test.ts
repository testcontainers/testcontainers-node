// import { createServer, Server } from "http";
// import { GenericContainer } from "./generic-container/generic-container";
// import { TestContainers } from "./test-containers";
// import { RandomUniquePortGenerator } from "./port-generator";
// import { Network } from "./network";
//
// describe("PortForwarder", () => {
//   jest.setTimeout(180_000);
//
//   let randomPort: number;
//   let server: Server;
//
//   beforeEach(async () => {
//     randomPort = await new RandomUniquePortGenerator().generatePort();
//
//     await new Promise<void>((resolve) => {
//       server = createServer((req, res) => {
//         res.writeHead(200);
//         res.end("hello world");
//       });
//       server.listen(randomPort, resolve);
//     });
//   });
//
//   afterEach(() => {
//     server.close();
//   });
//
//   it("should expose host ports to the container", async () => {
//     await TestContainers.exposeHostPorts(randomPort);
//
//     const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").start();
//
//     const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
//     expect(output).toEqual(expect.stringContaining("hello world"));
//
//     await container.stop();
//   });
//
//   it("should expose host ports to the container with custom network", async () => {
//     await TestContainers.exposeHostPorts(randomPort);
//
//     const network = await new Network().start();
//     const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withNetwork(network).start();
//
//     const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
//     expect(output).toEqual(expect.stringContaining("hello world"));
//
//     await container.stop();
//     await network.stop();
//   });
//
//   it("should expose host ports to the container with custom network and network alias", async () => {
//     await TestContainers.exposeHostPorts(randomPort);
//
//     const network = await new Network().start();
//     const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14")
//       .withNetwork(network)
//       .withNetworkAliases("foo")
//       .start();
//
//     const { output } = await container.exec(["curl", "-s", `http://host.testcontainers.internal:${randomPort}`]);
//     expect(output).toEqual(expect.stringContaining("hello world"));
//
//     await container.stop();
//     await network.stop();
//   });
// });
