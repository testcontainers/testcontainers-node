"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
class SystemPortCheckClient {
    isFree(port) {
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
    }
}
exports.SystemPortCheckClient = SystemPortCheckClient;
class BusyPortCheckClient {
    isFree(port) {
        return Promise.resolve(false);
    }
}
exports.BusyPortCheckClient = BusyPortCheckClient;
class FreePortCheckClient {
    isFree(port) {
        return Promise.resolve(true);
    }
}
exports.FreePortCheckClient = FreePortCheckClient;
