import { stripVTControlCharacters } from "node:util";
import { decodeBuildkitTrace } from "./buildkit-trace";

const MAX_LINES = 50;

type BuildEvent = {
  stream?: unknown;
  error?: unknown;
  errorDetail?: { message?: unknown };
  id?: unknown;
  aux?: unknown;
};

export class BuildOutput {
  private readonly lines: string[] = [];
  private partialLine = "";
  private truncated = false;
  private error?: string;

  public add(line: string): void {
    const event = this.parse(line);
    const error = event.errorDetail?.message ?? event.error;

    if (typeof error === "string") {
      this.error = error;
    } else if (typeof event.stream === "string") {
      this.append(event.stream);
    } else if (event.id === "moby.buildkit.trace" && typeof event.aux === "string") {
      this.append(decodeBuildkitTrace(event.aux));
    }
  }

  public getFailure(): string | undefined {
    if (this.error === undefined) {
      return undefined;
    }

    this.append("\n");
    if (this.lines.length === 0) {
      return this.error;
    }

    const heading = this.truncated ? `Last ${MAX_LINES} lines of build output:` : "Build output:";
    return [this.error, "", heading, ...this.lines].join("\n");
  }

  private parse(line: string): BuildEvent {
    try {
      return JSON.parse(line) ?? {};
    } catch {
      return {};
    }
  }

  private append(text: string): void {
    const lines = (this.partialLine + text).split("\n");
    this.partialLine = lines.pop() ?? "";

    for (const line of lines) {
      const trimmedLine = stripVTControlCharacters(line).trimEnd();
      if (trimmedLine.length > 0) {
        this.lines.push(trimmedLine);
      }
    }

    if (this.lines.length > MAX_LINES) {
      this.lines.splice(0, this.lines.length - MAX_LINES);
      this.truncated = true;
    }
  }
}
