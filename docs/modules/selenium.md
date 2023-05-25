# Selenium Module

[Selenium](https://www.selenium.dev/) If you want to create robust, browser-based regression automation suites and tests, scale and
distribute scripts across many environments, then you want to use Selenium WebDriver, a
collection of language specific bindings to drive a browser - the way it is meant to be driven.

## Examples

Spin up a Chrome web browser and navigate to a URL:

```javascript
const { SeleniumContainer } = require("testcontainers");

const container = await new SeleniumContainer("selenium/standalone-chrome:112.0")
  .start();

const driver = new Builder()
  .forBrowser(Browser.CHROME)
  .usingServer(container.getServerUrl())
  .build();

await driver.get("https://testcontainers.com");
await driver.quit();
```

You can use any Selenium supported web browser by providing the appropriate image and driver configuration, for example:

```javascript
const container = await new SeleniumContainer("selenium/standalone-edge:112.0")
  .start();

const driver = new Builder()
  .forBrowser(Browser.EDGE)
  ...
  .build();
```

A video recording of the browser session can be enabled and saved to disk once the container has been stopped:

```javascript
const container = await new SeleniumContainer("selenium/standalone-chrome:112.0")
  .withRecording()
  .start();

...

const stoppedContainer = await container.stop();
await stoppedContainer.saveRecording("/tmp/videos/recording.mp4");
```