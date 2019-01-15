"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const container_state_1 = require("./container-state");
const docker_client_1 = require("./docker-client");
const port_bindings_1 = require("./port-bindings");
const repo_tag_1 = require("./repo-tag");
const wait_strategy_1 = require("./wait-strategy");
class GenericContainer {
    constructor(image, tag = "latest") {
        this.image = image;
        this.tag = tag;
        this.dockerClient = new docker_client_1.DockerodeClient();
        this.ports = [];
        this.waitStrategy = new wait_strategy_1.HostPortWaitStrategy(this.dockerClient);
        this.repoTag = new repo_tag_1.RepoTag(image, tag);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dockerClient.pull(this.repoTag);
            const portBindings = yield new port_bindings_1.PortBinder().bind(this.ports);
            const container = yield this.dockerClient.create(this.repoTag, portBindings);
            yield this.dockerClient.start(container);
            const containerState = new container_state_1.ContainerState(portBindings);
            yield this.waitStrategy.waitUntilReady(container, containerState);
            return new StartedGenericContainer(container, portBindings);
        });
    }
    withExposedPorts(...ports) {
        this.ports = ports;
        return this;
    }
    withStartupTimeout(startupTimeout) {
        this.waitStrategy = this.waitStrategy.withStartupTimeout(startupTimeout);
        return this;
    }
}
exports.GenericContainer = GenericContainer;
class StartedGenericContainer {
    constructor(container, portBindings) {
        this.container = container;
        this.portBindings = portBindings;
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.container.stop();
            yield this.container.remove();
            return new StoppedGenericContainer();
        });
    }
    getMappedPort(port) {
        return this.portBindings.getBinding(port);
    }
}
class StoppedGenericContainer {
}
