import path from "node:path";
import { PlaywrightContainer } from "./playwright-container";

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.39.0-jammy";
  const examplePlaywrightProjectDirectory = path.resolve(__dirname, "..", "example-project");
  const reportPath = path.resolve(__dirname, "..", "playwright-report", "index.html");

  it(`should pass example tests creating a report for ${process.arch}`, async () => {
    const startedPlaywrightReportingContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      examplePlaywrightProjectDirectory
    )
      .withReporting()
      .start();

    const stoppedPlaywrightReportingContainer = await startedPlaywrightReportingContainer.stop();
    await stoppedPlaywrightReportingContainer.saveHtmlReport(reportPath);
  });
});
