import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";
import type { HostIp } from "../clients/types";

export const lookupHostIps = async (host: string): Promise<HostIp[]> => {
  if (net.isIP(host) === 0) {
    return await dnsLookup(host, { all: true });
  } else {
    return [{ address: host, family: net.isIP(host) }];
  }
};
