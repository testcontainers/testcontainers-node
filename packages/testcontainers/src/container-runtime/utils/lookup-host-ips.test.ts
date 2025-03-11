import { HostIp } from "../clients/types";
import { lookupHostIps } from "./lookup-host-ips";

const mockDnsLookup = vi.fn();
vi.mock("dns/promises", () => {
  return {
    lookup: () => mockDnsLookup(),
  };
});

describe("lookupHostIps", () => {
  it("should return a list of resolved host IPs when host is not an IP", async () => {
    const hostIps: HostIp[] = [{ address: "127.0.0.1", family: 4 }];
    mockDnsLookup.mockResolvedValueOnce(hostIps);
    expect(await lookupHostIps("localhost")).toEqual(hostIps);
  });

  it("should return host IP and v4 family when host is an IPv4 IP", async () => {
    expect(await lookupHostIps("127.0.0.1")).toEqual([{ address: "127.0.0.1", family: 4 }]);
    expect(mockDnsLookup).not.toHaveBeenCalled();
  });

  it("should return host IP and v6 family when host is an IPv6 IP", async () => {
    expect(await lookupHostIps("::1")).toEqual([{ address: "::1", family: 6 }]);
    expect(mockDnsLookup).not.toHaveBeenCalled();
  });
});
