import debug, { IDebugger } from "debug";

type Message = string;

type Options = {
  containerId?: string;
  imageName?: string;
};

export class Logger {
  private readonly logger: IDebugger;

  constructor(namespace: string, private readonly showLevel = true) {
    this.logger = debug(namespace);
  }

  public enabled(): boolean {
    return this.logger.enabled;
  }

  public trace(message: Message, options?: Options): void {
    this.logger(`${this.showLevel ? "[TRAC] " : ""}${this.renderOptions(options)}${message}`);
  }

  public debug(message: Message, options?: Options): void {
    this.logger(`${this.showLevel ? "[DEBU] " : ""}${this.renderOptions(options)}${message}`);
  }

  public info(message: Message, options?: Options): void {
    this.logger(`${this.showLevel ? "[INFO] " : ""}${this.renderOptions(options)}${message}`);
  }

  public warn(message: Message, options?: Options): void {
    this.logger(`${this.showLevel ? "[WARN] " : ""}${this.renderOptions(options)}${message}`);
  }

  public error(message: Message, options?: Options): void {
    this.logger(`${this.showLevel && "[ERRO] "}${this.renderOptions(options)}${message}`);
  }

  private renderOptions(options?: Options): string {
    let str = "";
    if (options?.containerId) {
      str += `[${options.containerId.substring(0, 12)}] `;
    }
    if (options?.imageName) {
      str += `[${options.imageName}] `;
    }
    return str;
  }
}

export const log = new Logger("testcontainers");
export const containerLog = new Logger("testcontainers:containers", false);
export const composeLog = new Logger("testcontainers:compose", false);
export const imageLog = new Logger("testcontainers:image", false);
export const execLog = new Logger("testcontainers:exec", false);
