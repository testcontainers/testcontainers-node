import { SeleniumContainer } from "./selenium-container";
import { Browser, Builder } from "selenium-webdriver";

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

      console.log(container.getMappedPort(7900));

      try {
        await driver.get("https://testcontainers.com");
        expect(await driver.getTitle()).toEqual("Testcontainers");
      } finally {
        await driver.quit();
        await container.stop();
      }
    });
  });
});
