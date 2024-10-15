import net from "node:net";
import dns from "node:dns";
import { HostIp } from "../clients/types.ts";

export const lookupHostIps = async (host: string): Promise<HostIp[]> => {
  if (net.isIP(host) === 0) {
    return await dns.promises.lookup(host, { all: true });
  } else {
    return [{ address: host, family: net.isIP(host) }];
  }
};
