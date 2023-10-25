import { PlaywrightContainer } from "./playwright-container";
import path from "node:path";

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  test(`should pass example tests and create a report for ${process.arch}`, async () => {
    const playwrightExampleProjectDir = path.resolve(__dirname, "..", "example-project");

    const playwrightContainer = await new PlaywrightContainer(
      "mcr.microsoft.com/playwright:v1.38.1-jammy",
      playwrightExampleProjectDir
    ).start();

    await playwrightContainer.getHtmlReport("./test-report.html");
  });
});
