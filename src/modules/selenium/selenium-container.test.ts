import { SELENIUM_VIDEO_IMAGE, SeleniumContainer } from "./selenium-container";
import { Browser, Builder } from "selenium-webdriver";
import tmp from "tmp";
import { GenericContainer } from "../../generic-container/generic-container";
import { StartedTestContainer } from "../../test-container";
import path from "path";

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
    ["CHROME", "selenium/standalone-chrome:112.0"],
    ["FIREFOX", "selenium/standalone-firefox:112.0"],
    ["EDGE", "selenium/standalone-edge:112.0"],
  ] as const;

  browsers.forEach(async ([browser, image]) => {
    it(`should work for ${browser}`, async () => {
      const container = await new SeleniumContainer(image).start();
      const driver = new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();

      await driver.get("https://testcontainers.com");
      expect(await driver.getTitle()).toEqual("Testcontainers");

      await driver.quit();
      await container.stop();
    });

    it(`should record video and save to disk for ${browser}`, async () => {
      const container = await new SeleniumContainer(image).withRecording().start();
      const driver = new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();
      await driver.get("https://testcontainers.com");
      await driver.quit();
      const stoppedContainer = await container.stop();

      const videoFilePath = tmp.fileSync({ keep: false, prefix: `video-${browser}`, postfix: ".mp4" }).name;
      const videoFileName = path.basename(videoFilePath);
      await stoppedContainer.saveRecording(videoFilePath);

      await ffmpegContainer.copyFilesToContainer([{ source: videoFilePath, target: `/tmp/${videoFileName}` }]);
      const { exitCode } = await ffmpegContainer.exec(["ffprobe", `/tmp/${videoFileName}`]);
      expect(exitCode).toBe(0);
    });
  });
});
