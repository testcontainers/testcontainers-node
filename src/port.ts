// import * as net from "net";
// import { HostIps } from "./docker/lookup-host-ips";
// import { HostPortBindings } from "./docker/types";
//
// export type PortWithBinding = {
//   container: number;
//   host: number;
// };
//
// export type PortWithOptionalBinding = number | PortWithBinding;
//
// export const getContainerPort = (port: PortWithOptionalBinding): number =>
//   typeof port === "number" ? port : port.container;
//
// export const hasHostBinding = (port: PortWithOptionalBinding): port is PortWithBinding => {
//   return typeof port === "object" && port.host !== undefined;
// };
//
// export const resolveHostPortBinding = (hostIps: HostIps, hostPortBindings: HostPortBindings): number => {
//   if (isDualStackIp(hostPortBindings)) {
//     return hostPortBindings[0].hostPort;
//   }
//
//   for (const { family } of hostIps) {
//     const hostPortBinding = hostPortBindings.find(({ hostIp }) => net.isIP(hostIp) === family);
//     if (hostPortBinding !== undefined) {
//       return hostPortBinding.hostPort;
//     }
//   }
//   throw new Error("No host port found for host IP");
// };
//
// const isDualStackIp = (hostPortBindings: HostPortBindings): boolean =>
//   hostPortBindings.length === 1 && hostPortBindings[0].hostIp === "";
