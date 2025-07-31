import path from "path";
import { Browser, Builder } from "selenium-webdriver";
import { GenericContainer } from "testcontainers";
import tmp from "tmp";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { SELENIUM_VIDEO_IMAGE, SeleniumContainer } from "./selenium-container";

const browsers = [
  ["CHROME", process.arch === "arm64" ? getImage(__dirname, 1) : getImage(__dirname, 0)],
  ["FIREFOX", process.arch === "arm64" ? getImage(__dirname, 3) : getImage(__dirname, 2)],
] as const;

describe.for(browsers)("SeleniumContainer", { timeout: 30_000 }, ([browser, image]) => {
  it(`should work for ${browser}`, async () => {
    // seleniumExample {
    await using container = await new SeleniumContainer(image).start();

    const driver = await new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();
    await driver.get("https://testcontainers.com");
    expect(await driver.getTitle()).toEqual("Testcontainers");

    await driver.quit();
    // }
  });

  it(`should record video and save to disk for ${browser}`, async () => {
    // seleniumVideoExample {
    const container = await new SeleniumContainer(image).withRecording().start();

    const driver = await new Builder().forBrowser(Browser[browser]).usingServer(container.getServerUrl()).build();
    await driver.get("https://testcontainers.com");

    await driver.quit();
    const stoppedContainer = await container.stop();

    const videoFilePath = tmp.fileSync({ keep: false, prefix: `video-${browser}`, postfix: ".mp4" }).name;
    const videoFileName = path.basename(videoFilePath);
    await stoppedContainer.saveRecording(videoFilePath);

    await using ffmpegContainer = await new GenericContainer(SELENIUM_VIDEO_IMAGE)
      .withCommand(["sleep", "infinity"])
      .start();
    await ffmpegContainer.copyFilesToContainer([{ source: videoFilePath, target: `/tmp/${videoFileName}` }]);
    const { exitCode } = await ffmpegContainer.exec(["ffprobe", `/tmp/${videoFileName}`]);
    expect(exitCode).toBe(0);
    // }
  });
});
