import { RandomSocketClient } from "./socket-client";

describe("SocketClient", () => {
    describe("RandomSocketClient", () => {
        it("should return a random socket", async () => {
            expect(await new RandomSocketClient().getPort()).toBeGreaterThan(0);
        });
    });
});
