// import { TestcontainersHostStrategy } from "./testcontainers-host-strategy";
//
// const mockGetDockerClientConfig = jest.fn();
// jest.mock("../docker-client-config", () => ({
//   getDockerClientConfig: () => mockGetDockerClientConfig(),
// }));
//
// describe("TestcontainersHostStrategy", () => {
//   it("should not be applicable when tc.host property is not set", async () => {
//     mockGetDockerClientConfig.mockResolvedValue({});
//
//     const strategy = new TestcontainersHostStrategy();
//     await strategy.init();
//
//     expect(strategy.isApplicable()).toBe(false);
//   });
//
//   it("should be applicable when tc.host property is set", async () => {
//     mockGetDockerClientConfig.mockResolvedValue({ tcHost: "tcp://tc:2375" });
//
//     const strategy = new TestcontainersHostStrategy();
//     await strategy.init();
//
//     expect(strategy.isApplicable()).toBe(true);
//   });
//
//   it("should return relevant fields", async () => {
//     mockGetDockerClientConfig.mockResolvedValue({ tcHost: "tcp://tc:2375" });
//
//     const strategy = new TestcontainersHostStrategy();
//     await strategy.init();
//     const dockerClient = await strategy.getDockerClient();
//
//     expect(dockerClient.uri).toEqual("tcp://tc:2375");
//     expect(dockerClient.composeEnvironment).toEqual({ DOCKER_HOST: "tcp://tc:2375" });
//     expect(dockerClient.allowUserOverrides).toBe(false);
//   });
// });
