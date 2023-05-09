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
    this.logger(this.formatMessage(message, "TRACE", options));
  }

  public debug(message: Message, options?: Options): void {
    this.logger(this.formatMessage(message, "DEBUG", options));
  }

  public info(message: Message, options?: Options): void {
    this.logger(this.formatMessage(message, "INFO", options));
  }

  public warn(message: Message, options?: Options): void {
    this.logger(this.formatMessage(message, "WARN", options));
  }

  public error(message: Message, options?: Options): void {
    this.logger(this.formatMessage(message, "ERROR", options));
  }

  private formatMessage(message: Message, level: string, options?: Options): string {
    return `${this.showLevel ? `[${level}] ` : ""}${this.renderOptions(options)}${message}`;
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
export const buildLog = new Logger("testcontainers:build", false);
export const pullLog = new Logger("testcontainers:pull", false);
export const execLog = new Logger("testcontainers:exec", false);
