# Playwright Module

[Playwright](https://playwright.dev/) is an [open source](https://github.com/microsoft/playwright) Microsoft 
end-to-end testing tool for modern web apps. You review the
[Playwright documentation](https://playwright.dev/docs/intro).

## Install

```bash
npm install @testcontainers/playwright --save-dev
```

## Features Implemented 

- Run Playwright tests in a playwright container
  - [x] Run all Playwright tests in a playwright container
  - [ ] Run specific tests in a playwright container
- Run Playwright tests in a playwright container and extract the reporter results
  - [x] Run Playwright tests in a playwright container and read the output line reporter.
  - [x] Run Playwright tests in a playwright container and read the output dot reporter.
  - [x] Run Playwright tests in a playwright container and extract the html reporter.
  - [ ] Run Playwright tests in a playwright container and open the html the json reporter.
  - [x] Run Playwright tests in a playwright container and extract the json reporter.
  - [x] Run Playwright tests in a playwright container and extract the junit reporter.
  - [x] Run Playwright tests in a playwright container and extract the blob reporter.
  - [ ] Run Playwright tests in a playwright container and extract a list of different kind of reporter.
- [ ] Run Playwright tests in a playwright container against your app container
- [ ] Run Tests in UI Mode that user can follow up outside the container using a browser.
- [ ] Run Trace viewer GUI that user can follow up and control outside the container using a browser.
- [ ] Debugging Playwright tests with the Playwright inspector in a Playwright container

## How to use

### Start a Playwright container

Playwright has official docker images in the [Microsoft Artifact Registry](https://mcr.microsoft.com/en-us/product/playwright/about) 
that you can review to choose a tag.

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  ).start();
```

### Execute test in a Playwright container

```typescript
const { output, exitCode } = await startedPlaywrightBuildInReporterContainer.exec([
    "npx",
    "playwright",
    "test",
  ]);
```

### Reporter

Review the [Playwright reporter documentation](https://playwright.dev/docs/test-reporters) in order to know the available reporters and how you can notify playwright which should be run and how.
Playwright has two different kind of reporters, the built-in reporters (line, dot) and the external reporters (html, json, junit, blob).
You can set which reporter and how to run it, configuring the `playwright.config.js` file in your project, or, in some cases, passing environment variables that can override this file configurations.
To extract the reporter generated by our tests, you can use the `saveReporter` method from the `PlaywrightContainer` class passing the type of reporter to extract and where do you want to extract it .

### Execute tests in a Playwright container and read the dot reporter output

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  ).start();

const { output, exitCode } = await startedPlaywrightBuildInReporterContainer.exec([
  "npx",
  "playwright",
  "test",
  "--reporter=dot",
]);
```

### Execute tests in a Playwright container and read the line reporter output

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  ).start();

const { output, exitCode } = await startedPlaywrightBuildInReporterContainer.exec([
  "npx",
  "playwright",
  "test",
  "--reporter=line",
]);
```

### Execute tests in a Playwright container and extract a html reporter with results

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");
const PLAYWRIGHT_SAVE_REPORTS_DIRECTORY = path.resolve(__dirname, "..", "example-reports");

const externalDestinationReporterPath = path.resolve(PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, "index.html");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  )
  .withEnvironment({ PLAYWRIGHT_HTML_REPORT: "test-reports" })
  .start();

const { output, exitCode } = await startedPlaywrightContainer.exec([
  "npx",
  "playwright",
  "test",
  "--reporter=html",
]);

await startedPlaywrightContainer.saveReporter(
  {
    type: "html",
    outputDir: "test-reports",
  },
  externalDestinationReporterPath
);
```

### Execute tests in a Playwright container and extract a json reporter with results

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");
const PLAYWRIGHT_SAVE_REPORTS_DIRECTORY = path.resolve(__dirname, "..", "example-reports");

const externalDestinationReporterPath = path.resolve(PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, "index.html");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  )
  .withEnvironment({ PLAYWRIGHT_JSON_OUTPUT_NAME: "results.json" })
  .start();

const { output, exitCode } = await startedPlaywrightContainer.exec([
  "npx",
  "playwright",
  "test",
  "--reporter=json",
]);

await startedPlaywrightContainer.saveReporter(
  {
    type: "json",
    outputFile: "results.json",
  },
  externalDestinationReporterPath
);
```

### Execute tests in a Playwright container and extract a blob reporter with results

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");
const PLAYWRIGHT_SAVE_REPORTS_DIRECTORY = path.resolve(__dirname, "..", "example-reports");

const externalDestinationReporterPath = path.resolve(PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, "index.html");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  )
  .start();

const { output, exitCode } = await startedPlaywrightContainer.exec([
  "npx",
  "playwright",
  "test",
  "--reporter=blob",
]);

await startedPlaywrightContainer.saveReporter(
  {
    type: "blob",
  },
  externalDestinationReporterPath
);
```
### Execute tests in a Playwright container and extract a junit reporter with results

```typescript
import path from "path";
import { PlaywrightContainer } from "@testcontainers/playwright";

const PLAYWRIGHT_IMAGE = "mcr.microsoft.com/playwright:v1.42.1-jammy";
const PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER = path.resolve(__dirname, "..", "example-project");
const PLAYWRIGHT_SAVE_REPORTS_DIRECTORY = path.resolve(__dirname, "..", "example-reports");

const externalDestinationReporterPath = path.resolve(PLAYWRIGHT_SAVE_REPORTS_DIRECTORY, "index.html");

const startedPlaywrightContainer = await new PlaywrightContainer(
    PLAYWRIGHT_IMAGE,
    PLAYWRIGHT_PROJECT_TESTS_TO_RUN_INTO_THE_CONTAINER
  )
  .withEnvironment({ PLAYWRIGHT_JUNIT_OUTPUT_NAME: "results.xml" })
  .start();

const { output, exitCode } = await startedPlaywrightContainer.exec([
  "npx",
  "playwright",
  "test",
  "--reporter=junit",
]);

await startedPlaywrightContainer.saveReporter(
  {
    type: "junit",
    fileName: "results.xml",
  },
  externalDestinationReporterPath
);
```