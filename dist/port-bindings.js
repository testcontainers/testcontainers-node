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
const port_client_1 = require("./port-client");
class PortBinder {
    constructor(portClient = new port_client_1.RandomPortClient()) {
        this.portClient = portClient;
    }
    bind(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            const portBindings = new PortBindings();
            for (const port of ports) {
                portBindings.setBinding(port, yield this.portClient.getPort());
            }
            return portBindings;
        });
    }
}
exports.PortBinder = PortBinder;
class PortBindings {
    constructor() {
        this.ports = new Map();
    }
    getBinding(port) {
        const binding = this.ports.get(port);
        if (!binding) {
            throw new Error(`No port binding found for :${port}`);
        }
        return binding;
    }
    setBinding(key, value) {
        this.ports.set(key, value);
    }
    getHostPorts() {
        return Array.from(this.ports.values());
    }
    iterator() {
        return this.ports;
    }
}
exports.PortBindings = PortBindings;
