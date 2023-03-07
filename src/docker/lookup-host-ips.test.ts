import { HostIps, lookupHostIps } from "./lookup-host-ips";
import dns from "dns";

jest.mock("dns", () => {
  return {
    promises: {
      lookup: jest.fn(),
      setDefaultResultOrder: jest.fn(),
    },
  };
});
const dnsMock = jest.mocked(dns);

describe("lookupHostIps", () => {
  it("should return a list of resolved host IPs when host is not an IP", async () => {
    const hostIps: HostIps = [{ address: "127.0.0.1", family: 4 }];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dnsMock.promises.lookup.mockResolvedValueOnce(hostIps);
    expect(await lookupHostIps("localhost")).toEqual(hostIps);
  });

  it("should return host IP and v4 family when host is an IPv4 IP", async () => {
    expect(await lookupHostIps("127.0.0.1")).toEqual([{ address: "127.0.0.1", family: 4 }]);
    expect(dnsMock.promises.lookup).not.toHaveBeenCalled();
  });

  it("should return host IP and v6 family when host is an IPv6 IP", async () => {
    expect(await lookupHostIps("::1")).toEqual([{ address: "::1", family: 6 }]);
    expect(dnsMock.promises.lookup).not.toHaveBeenCalled();
  });
});
