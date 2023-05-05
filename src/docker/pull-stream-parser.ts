import byline from "byline";
import { Readable } from "stream";
import { Logger } from "../logger";
import { DockerImageName } from "../docker-image-name";

export class PullStreamParser {
  constructor(private readonly dockerImageName: DockerImageName, private readonly logger: Logger) {}

  public consume(stream: Readable): Promise<void> {
    return new Promise((resolve) => {
      byline(stream).on("data", (line) => {
        if (this.logger.enabled()) {
          this.logger.trace(line, { imageName: this.dockerImageName.toString() });
        }
      });
      stream.on("end", resolve);
    });
  }
}
