import { PlaywrightContainer } from "./playwright-container";
import path from "node:path";

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  test(`should work for ${process.arch}`, async () => {
    const playwrightExampleProjectDir = path.resolve(__dirname, "..", "example-project");

    const playwrightContainer = await new PlaywrightContainer(
      "mcr.microsoft.com/playwright:v1.39.0-alpha-oct-10-2023-jammy",
      playwrightExampleProjectDir
    ).start();

    await playwrightContainer.getHtmlReport("./test-report.html");
  });
});
