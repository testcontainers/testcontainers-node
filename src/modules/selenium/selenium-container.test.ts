import { SELENIUM_VIDEO_IMAGE, SeleniumContainer } from "./selenium-container";
import { Browser, Builder } from "selenium-webdriver";
import tmp from "tmp";
import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import path from "path";
import { log } from "../../logger";

describe("SeleniumContainer", () => {
  jest.setTimeout(180_000);

  let ffmpegContainer: StartedTestContainer;

  beforeAll(async () => {
    ffmpegContainer = await new GenericContainer(SELENIUM_VIDEO_IMAGE).withCommand(["sleep", "infinity"]).start();
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
      log.error(`===== STARTING 'SHOULD WORK FOR ${browser}' TEST`);
      log.error("===== STARTING SELENIUM CONTAINER");
      const container = await new SeleniumContainer(image).start();
      log.error("===== STARTING WEBDRIVER");
      const driver = new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();

      log.error("===== NAV TO TESTCONTAINERS.COM");
      await driver.get("https://testcontainers.com");
      log.error("===== DO ASSERTION");
      expect(await driver.getTitle()).toEqual("Testcontainers");

      log.error("===== QUIT DRIVER");
      await driver.quit();
      log.error("===== STOP CONTAINER");
      await container.stop();
      log.error("===== STOPPED CONTAINER");
    });

    it(`should record video and save to disk for ${browser}`, async () => {
      log.error(`===== STARTING 'SHOULD RECORD FOR ${browser}' TEST`);
      log.error("===== STARTING SELENIUM CONTAINER");
      const container = await new SeleniumContainer(image).withRecording().start();
      log.error("===== STARTING WEBDRIVER");
      const driver = new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();
      log.error("===== NAV TO TESTCONTAINERS.COM");
      await driver.get("https://testcontainers.com");
      log.error("===== QUIT DRIVER");
      await driver.quit();
      log.error("===== STOP CONTAINER");
      const stoppedContainer = await container.stop();
      log.error("===== STOPPED CONTAINER");

      log.error("DO ASSERTIONS");
      const videoFilePath = tmp.fileSync({ keep: false, prefix: `video-${browser}`, postfix: ".mp4" }).name;
      const videoFileName = path.basename(videoFilePath);
      await stoppedContainer.saveRecording(videoFilePath);

      await ffmpegContainer.copyFilesToContainer([{ source: videoFilePath, target: `/tmp/${videoFileName}` }]);
      const { exitCode } = await ffmpegContainer.exec(["ffprobe", `/tmp/${videoFileName}`]);
      expect(exitCode).toBe(0);
    });
  });
});
