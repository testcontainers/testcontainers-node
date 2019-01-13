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
class PortBindings {
    constructor(socketClient = new socket_client_1.RandomSocketClient()) {
        this.socketClient = socketClient;
    }
    bind(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            const portBindings = yield this.createPortBindings(ports);
            return new BoundPortBindings(portBindings);
        });
    }
    createPortBindings(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            const portBindings = new Map();
            for (const port of ports) {
                portBindings.set(port, yield this.socketClient.getPort());
            }
            return portBindings;
        });
    }
}
exports.PortBindings = PortBindings;
class BoundPortBindings {
    constructor(portBindings) {
        this.portBindings = portBindings;
    }
    getMappedPort(port) {
        const mappedPort = this.portBindings.get(port);
        if (!mappedPort) {
            throw new Error(`No port mapping found for "${port}". Did you forget to bind it?`);
        }
        return mappedPort;
    }
    getExposedPorts() {
        const exposedPorts = {};
        for (const [k] of this.portBindings) {
            exposedPorts[k.toString()] = {};
        }
        return exposedPorts;
    }
    getPortBindings() {
        const portBindings = {};
        for (const [k, v] of this.portBindings) {
            portBindings[k.toString()] = [{ HostPort: v.toString() }];
        }
        return portBindings;
    }
}
exports.BoundPortBindings = BoundPortBindings;
