import debug, { IDebugger } from "debug";

type Message = string;

export interface Logger {
  trace(message: Message): void;
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

  public trace(message: Message): void {
    this.logger(`TRACE ${message}`);
  }

  public debug(message: Message): void {
    this.logger(`DEBUG ${message}`);
  }

  public info(message: Message): void {
    this.logger(`INFO ${message}`);
  }

  public warn(message: Message): void {
    this.logger(`WARN ${message}`);
  }

  public error(message: Message): void {
    this.logger(`ERROR ${message}`);
  }
}

export default new DebugLogger();
