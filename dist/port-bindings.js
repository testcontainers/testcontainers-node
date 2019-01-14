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
const socket_client_1 = require("./socket-client");
class PortBinder {
    constructor(socketClient = new socket_client_1.RandomSocketClient()) {
        this.socketClient = socketClient;
    }
    bind(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            const portMap = yield this.createPortMap(ports);
            return new DockerodePortBindings(portMap);
        });
    }
    createPortMap(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            const portMap = new PortMap();
            for (const port of ports) {
                portMap.setMapping(port, yield this.socketClient.getPort());
            }
            return portMap;
        });
    }
}
exports.PortBinder = PortBinder;
class DockerodePortBindings {
    constructor(portMap) {
        this.portMap = portMap;
    }
    getMappedPort(port) {
        const mappedPort = this.portMap.getMapping(port);
        if (!mappedPort) {
            throw new Error(`No port mapping found for "${port}". Did you forget to bind it?`);
        }
        return mappedPort;
    }
    getExposedPorts() {
        const exposedPorts = {};
        for (const [containerPort] of this.portMap.iterator()) {
            exposedPorts[containerPort.toString()] = {};
        }
        return exposedPorts;
    }
    getPortBindings() {
        const portBindings = {};
        for (const [containerPort, hostPort] of this.portMap.iterator()) {
            portBindings[containerPort.toString()] = [{ HostPort: hostPort.toString() }];
        }
        return portBindings;
    }
}
class FakePortBindings {
    constructor(portMap, containerExposedPorts, containerPortBindings) {
        this.portMap = portMap;
        this.containerExposedPorts = containerExposedPorts;
        this.containerPortBindings = containerPortBindings;
    }
    getMappedPort(port) {
        return this.portMap.getMapping(port);
    }
    getExposedPorts() {
        return this.containerExposedPorts;
    }
    getPortBindings() {
        return this.containerPortBindings;
    }
}
exports.FakePortBindings = FakePortBindings;
class PortMap {
    constructor() {
        this.portMap = new Map();
    }
    getMapping(port) {
        return this.portMap.get(port);
    }
    setMapping(key, value) {
        this.portMap.set(key, value);
    }
    iterator() {
        return this.portMap;
    }
}
exports.PortMap = PortMap;
