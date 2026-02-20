
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { OracleDbContainer } from "./oraclefree-container";
import oracledb from "oracledb";

const IMAGE = getImage(__dirname);

describe("OracleFreeContainer", { timeout: 240_000 }, () => {
    it("should connect and return a query result", async () => {
        await using container = await new OracleDbContainer(IMAGE).start();

        const connection = await oracledb.getConnection({
            user: container.getUsername(),
            password: container.getPassword(),
            connectString: container.getUrl(),
        });

        const result = await connection.execute("SELECT 1 FROM DUAL");
        expect(result.rows![0]).toEqual([1]);

        await connection.close();
    });
});