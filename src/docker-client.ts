import devNull from "dev-null";
import Dockerode, { Container } from "dockerode";
import log from "./logger";
import { BoundPortBindings } from "./port-bindings";
import { RepoTag } from "./repo-tag";

export interface DockerClient {
    pull(repoTag: RepoTag): Promise<void>;
    create(repoTag: RepoTag, portBindings: BoundPortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
}

export class DockerodeClient implements DockerClient {
    constructor(private readonly dockerode: Dockerode = new Dockerode()) {}

    public pull(repoTag: RepoTag): Promise<void> {
        return new Promise((resolve, reject) => {
            log.info(`Pulling image: ${repoTag.toString()}`);

            this.dockerode.pull(repoTag.toString(), {}, (err, stream) => {
                if (err) {
                    return reject(err);
                }
                stream.pipe(devNull());
                stream.on("end", resolve);
            });
        });
    }

    public create(repoTag: RepoTag, portBindings: BoundPortBindings): Promise<Container> {
        log.info(`Creating container for image: ${repoTag.toString()}`);

        return this.dockerode.createContainer({
            Image: repoTag.toString(),
            ExposedPorts: portBindings.getExposedPorts(),
            HostConfig: {
                PortBindings: portBindings.getPortBindings()
            }
        });
    }

    public start(container: Container): Promise<void> {
        log.info(`Starting container with ID: ${container.id}`);
        return container.start();
    }
}
