import { PlaywrightContainer } from "./playwright-container";
import * as path from "path";

const image =
  process.arch === "arm64"
    ? `mcr.microsoft.com/playwright:next-focal-arm64`
    : `mcr.microsoft.com/playwright:next-focal-amd64`;

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  test(`should work for ${process.arch}`, async () => {
    const playwrightExampleProjectDir = path.resolve(__dirname, "..", "example-project");

    const container = await new PlaywrightContainer(
      image,
      [
        {
          source: path.resolve(playwrightExampleProjectDir),
          target: "/playwright",
          mode: "rw",
        },
      ],
      80
    ).start();

    const { output, exitCode } = await container.exec(["echo", "hello", "world"]);

    console.log("output", output);
    console.log("exitCode", exitCode);

    await container.stop();
  });
});
