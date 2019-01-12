"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dockerode_1 = __importDefault(require("dockerode"));
const logger_1 = __importDefault(require("./logger"));
class DockerodeClient {
    constructor(dockerode = new dockerode_1.default()) {
        this.dockerode = dockerode;
    }
    pull(image) {
        return new Promise((resolve, reject) => {
            logger_1.default.info(`Pulling image: ${image}`);
            this.dockerode.pull(image, {}, (err, stream) => {
                if (err) {
                    return reject(err);
                }
                stream.pipe(process.stdout);
                stream.on("end", resolve);
            });
        });
    }
    create(image, portBindings) {
        logger_1.default.info(`Creating container for image: ${image}`);
        return this.dockerode.createContainer({
            Image: image,
            ExposedPorts: portBindings.getExposedPorts(),
            HostConfig: {
                PortBindings: portBindings.getPortBindings()
            }
        });
    }
    start(container) {
        logger_1.default.info(`Starting container with ID: ${container.id}`);
        return container.start();
    }
}
exports.DockerodeClient = DockerodeClient;
