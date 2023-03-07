import net from "net";
import dns from "dns";

dns.promises.setDefaultResultOrder("verbatim");

export type HostIps = Array<{ address: string; family: number }>;

export const lookupHostIps = async (host: string): Promise<HostIps> => {
  if (net.isIP(host) === 0) {
    return await dns.promises.lookup(host, { all: true });
  } else {
    return [{ address: host, family: net.isIP(host) }];
  }
};
