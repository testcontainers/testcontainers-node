import { PlaywrightContainer } from "./playwright-container";
import path from "node:path";

describe("PlaywrightContainer", () => {
  jest.setTimeout(180_000);

  const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.39.0-jammy";
  const exampleProjectDirectory = path.resolve(__dirname, "..", "example-project");
  const reportPath = path.resolve(__dirname, "..", "reports", "test.html");

  test(`should pass example tests creating a report for ${process.arch}`, async () => {
    await new PlaywrightContainer(PLAYWRIGHT_IMAGE, exampleProjectDirectory).withReporting(reportPath).start();
  });
});
