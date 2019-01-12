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
const port_bindings_1 = require("./port-bindings");
const socket_client_1 = require("./socket-client");
describe("PortBindings", () => {
    let socketClient;
    let portBindings;
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        socketClient = new socket_client_1.FixedSocketClient([1000, 2000]);
        portBindings = yield new port_bindings_1.PortBindings(socketClient).bind([1, 2]);
    }));
    it("should get mapped port", () => __awaiter(this, void 0, void 0, function* () {
        expect(portBindings.getMappedPort(1)).toBe(1000);
        expect(portBindings.getMappedPort(2)).toBe(2000);
    }));
    it("should get exposed ports", () => __awaiter(this, void 0, void 0, function* () {
        expect(portBindings.getExposedPorts()).toEqual({ 1: {}, 2: {} });
    }));
    it("should get port bindings", () => __awaiter(this, void 0, void 0, function* () {
        expect(portBindings.getPortBindings()).toEqual({ 1: [{ HostPort: "1000" }], 2: [{ HostPort: "2000" }] });
    }));
});
