import byline from "byline";
import { Readable } from "stream";
import { Logger } from "./logger";
import { RepoTag } from "./repo-tag";

export class PullStreamParser {
  constructor(private readonly repoTag: RepoTag, private readonly logger: Logger) {}

  public consume(stream: Readable): Promise<void> {
    const messagesById: Map<string, Set<string>> = new Map();
    const statusesById: Map<string, Set<string>> = new Map();

    return new Promise((resolve) => {
      byline(stream).on("data", (line) => {
        try {
          const json = JSON.parse(line);
          const { id, status } = json;

          const prefix = id ? `Pulling ${this.repoTag.toString()} - ${id}` : `Pulling ${this.repoTag.toString()}`;

          if (status === "Downloading") {
            const { current, total } = json.progressDetail;
            const percentage = Math.round(100 * (current / total));
            const message = `${prefix} - ${json.status} ${percentage}%`;
            const messages = this.getOrElse(messagesById, id, new Set());
            if (!messages.has(message)) {
              messages.add(message);
              this.logger.trace(message);
            }
          } else {
            const statuses = this.getOrElse(statusesById, id, new Set());
            if (!statuses.has(status)) {
              statuses.add(status);
              const message = `${prefix} - ${json.status}`;
              const messages = this.getOrElse(messagesById, id, new Set());
              if (!messages.has(message)) {
                messages.add(message);
                this.logger.trace(message);
              }
            }
          }
        } catch {
          this.logger.warn(`Unexpected message format: ${line}`);
        }
      });
      stream.on("end", resolve);
    });
  }

  private getOrElse<K, V>(map: Map<K, V>, key: K, orElse: V): V {
    const value = map.get(key);
    if (value === undefined) {
      map.set(key, orElse);
      return orElse;
    }
    return value;
  }
}
