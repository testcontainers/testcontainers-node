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

    const playwrightContainer = await new PlaywrightContainer(image, [
      {
        source: path.resolve(playwrightExampleProjectDir),
        target: "/playwright",
        mode: "rw",
      },
    ]).start();

    const { output, exitCode } = await playwrightContainer.exec(["echo", "hello", "world"]);

    console.log("output", output);
    console.log("exitCode", exitCode);

    await playwrightContainer.stop();
  });
});
