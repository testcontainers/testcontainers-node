export type PortWithBinding = {
  container: number;
  host: number;
  protocol?: "tcp" | "udp";
};

export type PortWithOptionalBinding = number | `${number}/${"tcp" | "udp"}` | PortWithBinding;

const portWithProtocolRegex = RegExp(/^(\d+)(?:\/(udp|tcp))?$/i);

export const getContainerPort = (port: PortWithOptionalBinding): number => {
  if (typeof port === "number") {
    return port;
  }
  if (typeof port === "string") {
    const match = portWithProtocolRegex.exec(port);
    if (match) {
      return parseInt(match[1], 10);
    }
    throw new Error(`Invalid port format: ${port}`);
  }
  return port.container;
};

export const hasHostBinding = (port: PortWithOptionalBinding): port is PortWithBinding => {
  return typeof port === "object" && port.host !== undefined;
};

export const getProtocol = (port: PortWithOptionalBinding): string => {
  if (typeof port === "number") {
    return "tcp";
  }
  if (typeof port === "string") {
    const match = portWithProtocolRegex.exec(port);
    if (match?.[2]) {
      return match[2].toLowerCase();
    }
    return "tcp";
  }
  return port.protocol ? port.protocol.toLowerCase() : "tcp";
};
