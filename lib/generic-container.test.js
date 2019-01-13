"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const generic_container_1 = require("./generic-container");
describe("GenericContainer", () => {
    it("should start and stop a container", () => __awaiter(this, void 0, void 0, function* () {
        const container = yield new generic_container_1.GenericContainer("tutum/hello-world").withExposedPorts(80).start();
        const testUrl = `http://localhost:${container.getMappedPort(80)}`;
        const containerResponse = yield node_fetch_1.default(testUrl);
        expect(containerResponse.status).toBe(200);
        yield container.stop();
    }), 10000);
});
