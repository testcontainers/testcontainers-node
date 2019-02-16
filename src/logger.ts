import debug, { IDebugger } from "debug";

type Message = string;

export interface Logger {
  debug(message: Message): void;
  info(message: Message): void;
  warn(message: Message): void;
  error(message: Message): void;
}

class DebugLogger implements Logger {
  private readonly logger: IDebugger;

  constructor() {
    this.logger = debug("testcontainers");
  }

  public debug(message: Message): void {
    this.logger(message);
  }

  public info(message: Message): void {
    this.logger(message);
  }

  public warn(message: Message): void {
    this.logger(message);
  }

  public error(message: Message): void {
    this.logger(message);
  }
}

export default new DebugLogger();
