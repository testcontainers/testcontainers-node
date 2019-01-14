import { Socket } from "net";
import { Port } from "./port";

export interface PortCheckClient {
  isFree(port: Port): Promise<boolean>;
}

export class SystemPortCheckClient implements PortCheckClient {
  public isFree(port: Port): Promise<boolean> {
    return new Promise(resolve => {
      const socket = new Socket();
      socket
        .setTimeout(1000)
        .on("error", () => {
          socket.destroy();
          resolve(true);
        })
        .on("timeout", () => {
          socket.destroy();
          resolve(true);
        })
        .connect(
          port,
          () => {
            socket.end();
            resolve(false);
          }
        );
    });
  }
}

export class BusyPortCheckClient implements PortCheckClient {
  public isFree(port: Port): Promise<boolean> {
    return Promise.resolve(false);
  }
}

export class FreePortCheckClient implements PortCheckClient {
  public isFree(port: Port): Promise<boolean> {
    return Promise.resolve(true);
  }
}
