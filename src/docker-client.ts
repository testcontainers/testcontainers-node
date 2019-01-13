import devNull from "dev-null";
import Dockerode, { Container } from "dockerode";
import log from "./logger";
import { StartedPortBindings } from "./port-bindings";

export interface DockerClient {
    pull(image: string): Promise<void>;
    create(image: string, portBindings: StartedPortBindings): Promise<Container>;
    start(container: Container): Promise<void>;
}

export class DockerodeClient implements DockerClient {
    constructor(private readonly dockerode: Dockerode = new Dockerode()) {}

    public pull(image: string): Promise<void> {
        return new Promise((resolve, reject) => {
            log.info(`Pulling image: ${image}`);

            this.dockerode.pull(image, {}, (err, stream) => {
                if (err) {
                    return reject(err);
                }
                stream.pipe(devNull());
                stream.on("end", resolve);
            });
        });
    }

    public create(image: string, portBindings: StartedPortBindings): Promise<Dockerode.Container> {
        log.info(`Creating container for image: ${image}`);

        return this.dockerode.createContainer({
            Image: image,
            ExposedPorts: portBindings.getExposedPorts(),
            HostConfig: {
                PortBindings: portBindings.getPortBindings()
            }
        });
    }

    public start(container: Dockerode.Container): Promise<void> {
        log.info(`Starting container with ID: ${container.id}`);
        return container.start();
    }
}
