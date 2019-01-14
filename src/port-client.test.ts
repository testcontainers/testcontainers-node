import { RandomPortClient } from "./port-client";

describe("PortClient", () => {
    describe("RandomPortClient", () => {
        it("should return a random socket", async () => {
            expect(await new RandomPortClient().getPort()).toBeGreaterThan(0);
        });
    });
});
