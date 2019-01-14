"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_port_1 = __importDefault(require("get-port"));
class RandomPortClient {
    getPort() {
        return get_port_1.default();
    }
}
exports.RandomPortClient = RandomPortClient;
class FixedPortClient {
    constructor(ports) {
        this.ports = ports;
        this.portIndex = 0;
    }
    getPort() {
        return Promise.resolve(this.ports[this.portIndex++]);
    }
}
exports.FixedPortClient = FixedPortClient;
