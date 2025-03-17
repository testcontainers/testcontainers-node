import path from "path";
import { Browser, Builder } from "selenium-webdriver";
import { GenericContainer } from "testcontainers";
import tmp from "tmp";
import { SeleniumContainer, SELENIUM_VIDEO_IMAGE } from "./selenium-container";

describe("SeleniumContainer", { timeout: 180_000 }, () => {
  const browsers = [
    ["CHROME", process.arch === "arm64" ? `seleniarm/standalone-chromium:112.0` : `selenium/standalone-chrome:112.0`],
    ["FIREFOX", process.arch === "arm64" ? `seleniarm/standalone-firefox:112.0` : `selenium/standalone-firefox:112.0`],
  ] as const;

  browsers.forEach(async ([browser, image]) => {
    it(`should work for ${browser}`, async () => {
      const container = await new SeleniumContainer(image).start();
      const driver = await new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();

      await driver.get("https://testcontainers.com");
      expect(await driver.getTitle()).toEqual("Testcontainers");

      await driver.quit();
      await container.stop();
    });

    it(`should record video and save to disk for ${browser}`, async () => {
      const container = await new SeleniumContainer(image).withRecording().start();
      const driver = await new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();
      await driver.get("https://testcontainers.com");
      await driver.quit();
      const stoppedContainer = await container.stop();

      const videoFilePath = tmp.fileSync({ keep: false, prefix: `video-${browser}`, postfix: ".mp4" }).name;
      const videoFileName = path.basename(videoFilePath);
      await stoppedContainer.saveRecording(videoFilePath);

      const ffmpegContainer = await new GenericContainer(SELENIUM_VIDEO_IMAGE)
        .withCommand(["sleep", "infinity"])
        .start();
      await ffmpegContainer.copyFilesToContainer([{ source: videoFilePath, target: `/tmp/${videoFileName}` }]);
      const { exitCode } = await ffmpegContainer.exec(["ffprobe", `/tmp/${videoFileName}`]);
      expect(exitCode).toBe(0);
      await ffmpegContainer.stop();
    });
  });
});
