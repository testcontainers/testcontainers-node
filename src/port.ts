export type Port = number;
export type PortString = string;

export type PortWithOptionalBinding =
  | Port
  | {
      container: number;
      host: number;
    };

export const getContainerPort = (port: PortWithOptionalBinding): number =>
  typeof port === "number" ? port : port.container;
