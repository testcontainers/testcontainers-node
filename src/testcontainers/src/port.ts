export type PortWithBinding = {
  container: number;
  host: number;
};

export type PortWithOptionalBinding = number | PortWithBinding;

export const getContainerPort = (port: PortWithOptionalBinding): number =>
  typeof port === "number" ? port : port.container;

export const hasHostBinding = (port: PortWithOptionalBinding): port is PortWithBinding => {
  return typeof port === "object" && port.host !== undefined;
};
