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
  } else if (typeof port === "string") {
    const match = port.match(/^(\d+)(?:\/(udp|tcp))?$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    throw new Error(`Invalid port format: ${port}`);
  } else {
    return port.container;
  }
};

export const hasHostBinding = (port: PortWithOptionalBinding): port is PortWithBinding => {
  return typeof port === "object" && port.host !== undefined;
};

export const getProtocol = (port: PortWithOptionalBinding): string => {
  if (typeof port === "number") {
    return "tcp";
  } else if (typeof port === "string") {
    const match = port.match(/^(\d+)(?:\/(udp|tcp))?$/i);
    if (match && match[2]) {
      return match[2].toLowerCase();
    }
    return "tcp";
  } else {
    return port.protocol ? port.protocol.toLowerCase() : "tcp";
  }
};
