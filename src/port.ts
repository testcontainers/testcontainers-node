export type Port = number;
export type PortString = string;

export type PortWithOptionalBinding =
  | Port
  | {
      container: Port;
      host: Port;
    };

export const getContainerPort = (port: PortWithOptionalBinding): number =>
  typeof port === "number" ? port : port.container;
