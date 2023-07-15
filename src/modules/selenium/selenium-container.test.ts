import {
  SELENIUM_VIDEO_IMAGE,
  SeleniumContainer,
  StartedSeleniumContainer,
  StartedSeleniumRecordingContainer,
} from "./selenium-container";
import { Browser, Builder, WebDriver } from "selenium-webdriver";
import tmp from "tmp";
import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import path from "path";

jest.retryTimes(1, { logErrorsBeforeRetry: true });

describe("SeleniumContainer", () => {
  jest.setTimeout(180_000);

  let ffmpegContainer: StartedTestContainer;
  let seleniumContainer: StartedSeleniumContainer | undefined;
  let seleniumRecordingContainer: StartedSeleniumRecordingContainer | undefined;
  let driver: WebDriver | undefined;

  beforeAll(async () => {
    ffmpegContainer = await new GenericContainer(SELENIUM_VIDEO_IMAGE).withCommand(["sleep", "infinity"]).start();
  });

  afterEach(async () => {
    if (driver) {
      try {
        await driver.quit();
      } catch {
        // ignore
      } finally {
        driver = undefined;
      }
    }
    if (seleniumContainer) {
      try {
        await seleniumContainer.stop();
      } finally {
        seleniumContainer = undefined;
      }
    }
    if (seleniumRecordingContainer) {
      try {
        await seleniumRecordingContainer.stop();
      } catch {
        // ignore
      } finally {
        seleniumRecordingContainer = undefined;
      }
    }
  });

  afterAll(async () => {
    await ffmpegContainer.stop();
  });

  const browsers = [
    ["CHROME", process.arch === "arm64" ? `seleniarm/standalone-chromium:112.0` : `selenium/standalone-chrome:112.0`],
    ["FIREFOX", process.arch === "arm64" ? `seleniarm/standalone-firefox:112.0` : `selenium/standalone-firefox:112.0`],
  ] as const;

  browsers.forEach(async ([browser, image]) => {
    it(`should work for ${browser}`, async () => {
      seleniumContainer = await new SeleniumContainer(image).start();
      driver = new Builder().forBrowser(Browser[browser]).usingServer(seleniumContainer.getServerUrl()).build();

      await driver.get("https://testcontainers.com");
      expect(await driver.getTitle()).toEqual("Testcontainers");

      await driver.quit();
      await seleniumContainer.stop();
    });

    it(`should record video and save to disk for ${browser}`, async () => {
      seleniumRecordingContainer = await new SeleniumContainer(image).withRecording().start();
      driver = new Builder()
        .forBrowser(Browser[browser])
        .usingServer(seleniumRecordingContainer.getServerUrl())
        .build();
      await driver.get("https://testcontainers.com");
      await driver.quit();
      const stoppedContainer = await seleniumRecordingContainer.stop();

      const videoFilePath = tmp.fileSync({ keep: false, prefix: `video-${browser}`, postfix: ".mp4" }).name;
      const videoFileName = path.basename(videoFilePath);
      await stoppedContainer.saveRecording(videoFilePath);

      await ffmpegContainer.copyFilesToContainer([{ source: videoFilePath, target: `/tmp/${videoFileName}` }]);
      const { exitCode } = await ffmpegContainer.exec(["ffprobe", `/tmp/${videoFileName}`]);
      expect(exitCode).toBe(0);
    });
  });
});
