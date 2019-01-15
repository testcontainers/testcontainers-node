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
const net_1 = require("net");
class HostPortCheck {
    isBound(port) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const socket = new net_1.Socket();
                socket
                    .setTimeout(1000)
                    .on("error", () => {
                    socket.destroy();
                    resolve(true);
                })
                    .on("timeout", () => {
                    socket.destroy();
                    resolve(true);
                })
                    .connect(port, () => {
                    socket.end();
                    resolve(false);
                });
            });
        });
    }
}
exports.HostPortCheck = HostPortCheck;
class InternalPortCheck {
    constructor(container, dockerClient) {
        this.container = container;
        this.dockerClient = dockerClient;
    }
    isBound(port) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = [
                ["/bin/sh", "-c", `cat /proc/net/tcp | awk '{print $2}' | grep -i :${port.toString(16)}`],
                ["/bin/sh", "-c", `cat /proc/net/tcp6 | awk '{print $2}' | grep -i :${port.toString(16)}`],
                ["/bin/sh", "-c", `nc -vz -w 1 localhost ${port}`],
                ["/bin/sh", "-c", `</dev/tcp/localhost/${port}`]
            ];
            const commandResults = yield Promise.all(commands.map(command => this.dockerClient.exec(this.container, command)));
            return commandResults.some(result => result.exitCode === 0);
        });
    }
}
exports.InternalPortCheck = InternalPortCheck;
