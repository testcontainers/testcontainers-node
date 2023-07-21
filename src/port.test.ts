// import { resolveHostPortBinding } from "./port";
// import { HostIps } from "./docker/lookup-host-ips";
//
// describe("resolveHostPortBinding", () => {
//   it("should return IPv6-mapped host port when preferred", () => {
//     const hostIps: HostIps = [
//       { address: "::1", family: 6 },
//       { address: "127.0.0.1", family: 4 },
//     ];
//     const ports = [
//       { hostIp: "0.0.0.0", hostPort: 50000 },
//       { hostIp: "::", hostPort: 50001 },
//     ];
//     expect(resolveHostPortBinding(hostIps, ports)).toBe(50001);
//   });
//
//   it("should return IPv4-mapped host port when preferred", () => {
//     const hostIps: HostIps = [
//       { address: "127.0.0.1", family: 4 },
//       { address: "::1", family: 6 },
//     ];
//     const ports = [
//       { hostIp: "0.0.0.0", hostPort: 50000 },
//       { hostIp: "::", hostPort: 50001 },
//     ];
//     expect(resolveHostPortBinding(hostIps, ports)).toBe(50000);
//   });
//
//   // https://github.com/containers/podman/issues/17780
//   it("should return mapped host port when dual stack IP", () => {
//     const hostIps: HostIps = [
//       { address: "127.0.0.1", family: 4 },
//       { address: "::1", family: 6 },
//     ];
//     const ports = [{ hostIp: "", hostPort: 50000 }];
//     expect(resolveHostPortBinding(hostIps, ports)).toBe(50000);
//   });
//
//   it("should throw when no host port available for host IP family", () => {
//     const hostIps: HostIps = [{ address: "::1", family: 6 }];
//     const ports = [{ hostIp: "0.0.0.0", hostPort: 50000 }];
//     expect(() => resolveHostPortBinding(hostIps, ports)).toThrow("No host port found for host IP");
//   });
// });
