import path from "path";
import { PlaywrightContainer } from "./playwright-container";

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.39.0-jammy";
  const playwrightProjectDirectory = path.resolve(__dirname, "..", "example-project");
  const pathToSaveReport = path.resolve(__dirname, "..", "playwright-report", "index.html");

  it(`should pass example tests creating a report for ${process.arch}`, async () => {
    const startedPlaywrightReportingContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      playwrightProjectDirectory
    )
      .withReporting()
      .start();

    await startedPlaywrightReportingContainer.saveHtmlReport(pathToSaveReport);
    await startedPlaywrightReportingContainer.stop({ remove: false });
  });
});
