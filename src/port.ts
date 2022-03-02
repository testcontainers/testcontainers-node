export type Port = number;
export type PortString = string;

export type PortWithBinding = {
  container: Port;
  host: Port;
};

export type PortWithOptionalBinding = Port | PortWithBinding;

export const getContainerPort = (port: PortWithOptionalBinding): number =>
  typeof port === "number" ? port : port.container;

export const hasHostBinding = (port: PortWithOptionalBinding): port is PortWithBinding => {
  return typeof port === "object" && port.host !== undefined;
};
