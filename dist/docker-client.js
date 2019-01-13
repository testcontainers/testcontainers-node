"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dev_null_1 = __importDefault(require("dev-null"));
const dockerode_1 = __importDefault(require("dockerode"));
const logger_1 = __importDefault(require("./logger"));
class DockerodeClient {
    constructor(dockerode = new dockerode_1.default()) {
        this.dockerode = dockerode;
    }
    pull(repoTag) {
        return new Promise((resolve, reject) => {
            logger_1.default.info(`Pulling image: ${repoTag.toString()}`);
            this.dockerode.pull(repoTag.toString(), {}, (err, stream) => {
                if (err) {
                    return reject(err);
                }
                stream.pipe(dev_null_1.default());
                stream.on("end", resolve);
            });
        });
    }
    create(repoTag, portBindings) {
        logger_1.default.info(`Creating container for image: ${repoTag.toString()}`);
        return this.dockerode.createContainer({
            Image: repoTag.toString(),
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
