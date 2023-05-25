import { SeleniumContainer } from "./selenium-container";
import { Browser, Builder } from "selenium-webdriver";
import fs from "fs";
import tmp from "tmp";

describe("SeleniumContainer", () => {
  jest.setTimeout(180_000);

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

    it("should record video and save to disk", async () => {
      const container = await new SeleniumContainer(image).withRecording().start();
      const driver = new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();
      await driver.get("https://testcontainers.com");
      await driver.quit();
      const stoppedSeleniumContainer = await container.stop();

      const tmpFile = tmp.fileSync({ prefix: `video-${browser}`, postfix: ".mp4" });
      await stoppedSeleniumContainer.exportVideo(tmpFile.name);

      expect(fs.existsSync(tmpFile.name)).toBe(true);
      tmpFile.removeCallback();
    });
  });
});
