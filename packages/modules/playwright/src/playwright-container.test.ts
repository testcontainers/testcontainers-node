import path from "path";
import { existsSync } from "fs";
import { PlaywrightContainer } from "./playwright-container";

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
  const playwrightSaveReportsDirectory = path.resolve(__dirname, "..", "example-reports");
  const playwrightProjectDirectory = path.resolve(__dirname, "..", "example-project");

  it(`should pass example tests with build in line reporter for ${process.arch}`, async () => {
    const startedPlaywrightBuildInReporterContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      playwrightProjectDirectory
    )
      .withBuildInReporter("dot")
      .start();

    await startedPlaywrightBuildInReporterContainer.stop();
  });

  it(`should pass example tests creating an html reporter for ${process.arch}`, async () => {
    const destinationHtmlReporterPath = path.resolve(playwrightSaveReportsDirectory, "index.html");

    const startedPlaywrightExportableReporterContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      playwrightProjectDirectory
    )
      .withExportableReporter(["html", { outputFolder: "test-reports" }])
      .start();

    await startedPlaywrightExportableReporterContainer.saveReporter(destinationHtmlReporterPath);
    await startedPlaywrightExportableReporterContainer.stop();

    expect(existsSync(destinationHtmlReporterPath)).toBe(true);
  });

  it(`should pass example tests creating a json reporter for ${process.arch}`, async () => {
    const destinationJsonReporterPath = path.resolve(playwrightSaveReportsDirectory, "results.json");

    const startedPlaywrightExportableReporterContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      playwrightProjectDirectory
    )
      .withExportableReporter(["json", { outputFile: "test-reports" }])
      .start();

    await startedPlaywrightExportableReporterContainer.saveReporter(destinationJsonReporterPath);
    await startedPlaywrightExportableReporterContainer.stop();

    expect(existsSync(destinationJsonReporterPath)).toBe(true);
  });
});
