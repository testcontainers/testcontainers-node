# Selenium

## Install

```bash
npm install @testcontainers/selenium --save-dev
```

## Examples

These examples use the following libraries:

- [selenium-webdriver](https://www.npmjs.com/package/selenium-webdriver)

        npm install selenium-webdriver
        npm install @types/selenium-webdriver --save-dev

Choose an image from the container registry and substitute `IMAGE`:

- [AMD Standalone Chrome](https://hub.docker.com/r/selenium/standalone-chrome)
- [AMD Standalone Firefox](https://hub.docker.com/r/selenium/standalone-firefox)
- [ARM Standalone Chromium](https://hub.docker.com/r/seleniarm/standalone-chromium)
- [ARM Standalone Firefox](https://hub.docker.com/r/seleniarm/standalone-firefox)

### Navigate to a page

<!--codeinclude-->
[](../../packages/modules/selenium/src/selenium-container.test.ts) inside_block:seleniumExample
<!--/codeinclude-->

### Record a video

<!--codeinclude-->
[](../../packages/modules/selenium/src/selenium-container.test.ts) inside_block:seleniumVideoExample
<!--/codeinclude-->
