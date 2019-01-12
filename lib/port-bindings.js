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
            const result = new Map();
            for (const port of ports) {
                result.set(port, yield this.socketClient.getPort());
            }
            return new StartedPortBindings(result);
        });
    }
}
exports.PortBindings = PortBindings;
class StartedPortBindings {
    constructor(portBindings) {
        this.portBindings = portBindings;
    }
    getMappedPort(port) {
        const result = this.portBindings.get(port);
        if (!result) {
            throw new Error();
        }
        return result;
    }
    getExposedPorts() {
        const result = {};
        for (const [k] of this.portBindings) {
            result[k.toString()] = {};
        }
        return result;
    }
    getPortBindings() {
        const result = {};
        for (const [k, v] of this.portBindings) {
            result[k.toString()] = [{ HostPort: v.toString() }];
        }
        return result;
    }
}
exports.StartedPortBindings = StartedPortBindings;
