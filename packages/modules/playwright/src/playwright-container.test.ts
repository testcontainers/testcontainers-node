import path from "path";
import { existsSync } from "fs";
import { PlaywrightContainer } from "./playwright-container";

describe("PlaywrightContainer", () => {
  jest.setTimeout(360_000);

  const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
  const EXTERNAL_PLAYWRIGHT_SAVE_REPORTS_DIRECTORY = path.resolve(__dirname, "..", "example-reports");
  const EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY = path.resolve(__dirname, "example-project");

  const SUCCESSFUL_TEST_RUNNING_OUTPUT = "Running";
  const SUCCESSFUL_TEST_PASSED_OUTPUT = "passed";
  const SUCCESSFUL_TEST_EXIT_CODE = 0;

  it(`should pass example tests with a dot build in reporter`, async () => {
    const startedPlaywrightBuildInReporterContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY
    ).start();

    const { output, exitCode } = await startedPlaywrightBuildInReporterContainer.exec([
      "npx",
      "playwright",
      "test",
      "--reporter=dot",
    ]);

    await startedPlaywrightBuildInReporterContainer.stop();

    expect(output).toContain(SUCCESSFUL_TEST_RUNNING_OUTPUT);
    expect(output).toContain(SUCCESSFUL_TEST_PASSED_OUTPUT);
    expect(exitCode).toBe(SUCCESSFUL_TEST_EXIT_CODE);
  });

  it(`should pass example tests with a line build in reporter`, async () => {
    const startedPlaywrightBuildInReporterContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY
    ).start();

    const { output, exitCode } = await startedPlaywrightBuildInReporterContainer.exec([
      "npx",
      "playwright",
      "test",
      "--reporter=line",
    ]);

    await startedPlaywrightBuildInReporterContainer.stop();

    expect(output).toContain(SUCCESSFUL_TEST_RUNNING_OUTPUT);
    expect(output).toContain(SUCCESSFUL_TEST_PASSED_OUTPUT);
    expect(exitCode).toBe(SUCCESSFUL_TEST_EXIT_CODE);
  });

  it(`should pass example tests creating an html reporter`, async () => {
    const externalDestinationReporterPath = path.resolve(EXTERNAL_PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, "index.html");

    const startedPlaywrightContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY
    )
      .withEnvironment({ PLAYWRIGHT_HTML_REPORT: "test-reports" })
      .start();

    const { output, exitCode } = await startedPlaywrightContainer.exec([
      "npx",
      "playwright",
      "test",
      "--reporter=html",
    ]);

    await startedPlaywrightContainer.saveReporter("html", externalDestinationReporterPath);

    expect(output).toContain(SUCCESSFUL_TEST_RUNNING_OUTPUT);
    expect(output).toContain(SUCCESSFUL_TEST_PASSED_OUTPUT);
    expect(output).toContain("To open last HTML report run");
    expect(output).toContain("npx playwright show-report");
    expect(exitCode).toBe(SUCCESSFUL_TEST_EXIT_CODE);
    expect(existsSync(externalDestinationReporterPath)).toBe(true);

    await startedPlaywrightContainer.stop();
  });

  it(`should pass example tests creating a json reporter`, async () => {
    const externalDestinationReporterPath = path.resolve(EXTERNAL_PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, "results.json");

    const startedPlaywrightContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY
    )
      .withEnvironment({ PLAYWRIGHT_JSON_OUTPUT_NAME: "results.json" })
      .start();

    const { output, exitCode } = await startedPlaywrightContainer.exec([
      "npx",
      "playwright",
      "test",
      "--reporter=json",
    ]);

    await startedPlaywrightContainer.saveReporter("json", externalDestinationReporterPath);
    await startedPlaywrightContainer.stop();

    expect(output).toContain(SUCCESSFUL_TEST_RUNNING_OUTPUT);
    expect(output).toContain(SUCCESSFUL_TEST_PASSED_OUTPUT);
    expect(exitCode).toBe(SUCCESSFUL_TEST_EXIT_CODE);
    expect(existsSync(externalDestinationReporterPath)).toBe(true);
  });

  it(`should pass example tests creating a bob reporter`, async () => {
    const externalDestinationReporterPath = path.resolve(
      EXTERNAL_PLAYWRIGHT_SAVE_REPORTS_DIRECTORY,
      `report-${process.arch}.zip`
    );

    const startedPlaywrightContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY
    ).start();

    const { output, exitCode } = await startedPlaywrightContainer.exec([
      "npx",
      "playwright",
      "test",
      "--reporter=blob",
    ]);

    await startedPlaywrightContainer.saveReporter("blob", externalDestinationReporterPath);
    await startedPlaywrightContainer.stop();

    expect(output).toContain(SUCCESSFUL_TEST_RUNNING_OUTPUT);
    expect(output).toContain(SUCCESSFUL_TEST_PASSED_OUTPUT);
    expect(exitCode).toBe(SUCCESSFUL_TEST_EXIT_CODE);
    expect(existsSync(externalDestinationReporterPath)).toBe(true);
  });

  it(`should pass example tests creating a junit reporter`, async () => {
    const externalDestinationReporterPath = path.resolve(EXTERNAL_PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, `results.xml`);

    const startedPlaywrightContainer = await new PlaywrightContainer(
      PLAYWRIGHT_IMAGE,
      EXTERNAL_PLAYWRIGHT_PROJECT_DIRECTORY
    )
      .withEnvironment({ PLAYWRIGHT_JUNIT_OUTPUT_NAME: "results.xml" })
      .start();

    const { output, exitCode } = await startedPlaywrightContainer.exec([
      "npx",
      "playwright",
      "test",
      "--reporter=junit",
    ]);

    await startedPlaywrightContainer.saveReporter("junit", externalDestinationReporterPath);
    await startedPlaywrightContainer.stop();

    expect(output).toContain(SUCCESSFUL_TEST_RUNNING_OUTPUT);
    expect(output).toContain(SUCCESSFUL_TEST_PASSED_OUTPUT);
    expect(exitCode).toBe(SUCCESSFUL_TEST_EXIT_CODE);
    expect(existsSync(externalDestinationReporterPath)).toBe(true);
  });
});
