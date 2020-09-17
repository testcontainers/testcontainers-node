import byline from "byline";
import { Readable } from "stream";
import { Logger } from "./logger";
import { RepoTag } from "./repo-tag";

export class PullStreamParser {
  constructor(private readonly repoTag: RepoTag, private readonly logger: Logger) {}

  public consume(stream: Readable): Promise<void> {
    const messages = new Set();
    const statusesById: Map<string, Set<string>> = new Map();

    return new Promise((resolve) => {
      byline(stream).on("data", (data) => {
        try {
          const json = JSON.parse(data);
          const { id, status } = json;

          const prefix = `Pull ${this.repoTag.toString()} - ${id}`;

          if (status === "Downloading") {
            const { current, total } = json.progressDetail;
            const percentage = Math.round(100 * (current / total));
            const message = `${prefix} - ${json.status} ${percentage}%`;
            if (!messages.has(message)) {
              messages.add(message);
              this.logger.trace(message);
            }
          } else {
            if (!statusesById.get(id)) {
              statusesById.set(id, new Set());
            }
            if (!statusesById.get(id)!.has(status)) {
              statusesById.get(id)!.add(status);
              const message = `${prefix} - ${json.status}`;
              if (!messages.has(message)) {
                messages.add(message);
                this.logger.trace(message);
              }
            }
          }
        } catch {
          this.logger.warn(`Unexpected message format: ${data}`);
        }
      });
      stream.on("end", resolve);
    });
  }
}
