import net from "net";
import dns from "dns";
import { HostIp } from "../clients/types";

export const lookupHostIps = async (host: string): Promise<HostIp[]> => {
  if (net.isIP(host) === 0) {
    return await dns.promises.lookup(host, { all: true });
  } else {
    return [{ address: host, family: net.isIP(host) }];
  }
};
