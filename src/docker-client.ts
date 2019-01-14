import devNull from "dev-null";
import Dockerode, { Container, PortMap as DockerodePortMap } from "dockerode";
import log from "./logger";
import { PortString } from "./port";
import { PortBindings } from "./port-bindings";
import { RepoTag } from "./repo-tag";

export interface DockerClient {
    pull(repoTag: RepoTag): Promise<void>;
    create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
}

export class DockerodeClient implements DockerClient {
    constructor(private readonly dockerode: Dockerode = new Dockerode()) {}

    public pull(repoTag: RepoTag): Promise<void> {
        return new Promise((resolve, reject) => {
            log.info(`Pulling image: ${repoTag}`);

            this.dockerode.pull(repoTag.toString(), {}, (err, stream) => {
                if (err) {
                    return reject(err);
                }
                stream.pipe(devNull());
                stream.on("end", resolve);
            });
        });
    }

    public create(repoTag: RepoTag, portBindings: PortBindings): Promise<Container> {
        log.info(`Creating container for image: ${repoTag}`);

        return this.dockerode.createContainer({
            Image: repoTag.toString(),
            ExposedPorts: this.getExposedPorts(portBindings),
            HostConfig: {
                PortBindings: this.getPortBindings(portBindings)
            }
        });
    }

    public start(container: Container): Promise<void> {
        log.info(`Starting container with ID: ${container.id}`);
        return container.start();
    }

    private getExposedPorts(portBindings: PortBindings): DockerodeExposedPorts {
        const dockerodeExposedPorts: DockerodeExposedPorts = {};
        for (const [internalPort] of portBindings.iterator()) {
            dockerodeExposedPorts[internalPort.toString()] = {};
        }
        return dockerodeExposedPorts;
    }

    private getPortBindings(portBindings: PortBindings): DockerodePortBindings {
        const dockerodePortBindings: DockerodePortBindings = {};
        for (const [internalPort, hostPort] of portBindings.iterator()) {
            dockerodePortBindings[internalPort.toString()] = [{ HostPort: hostPort.toString() }];
        }
        return dockerodePortBindings;
    }
}

type DockerodeExposedPorts = { [port in PortString]: {} };

type DockerodePortBindings = DockerodePortMap;
