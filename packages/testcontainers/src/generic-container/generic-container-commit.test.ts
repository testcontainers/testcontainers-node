import { expect } from "vitest";
import { RandomUuid } from "../common";
import { getContainerRuntimeClient } from "../container-runtime";
import { getReaper } from "../reaper/reaper";
import { LABEL_TESTCONTAINERS_SESSION_ID } from "../utils/labels";
import { deleteImageByName, getImageInfo } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";

describe("GenericContainer commit", { timeout: 180_000 }, () => {
  const imageName = "cristianrgreco/testcontainer";
  const imageVersion = "1.1.14";

  it("should commit container changes to a new image", async () => {
    const testContent = "test content";
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const testAuthor = "test-author";
    const testComment = "test-comment";

    // Start original container and make a change
    const container = await new GenericContainer(`${imageName}:${imageVersion}`).withExposedPorts(8080).start();

    // Make a change to the container
    await container.exec(["sh", "-c", `echo '${testContent}' > /test-file.txt`]);

    // Commit the changes to a new image
    const imageId = await container.commit({
      repo: imageName,
      tag: newImageTag,
      author: testAuthor,
      comment: testComment,
    });

    // Verify image metadata is set
    const imageInfo = await getImageInfo(imageId);
    expect(imageInfo.Author).toBe(testAuthor);
    expect(imageInfo.Comment).toBe(testComment);

    // Start a new container from the committed image
    const newContainer = await new GenericContainer(imageId).withExposedPorts(8080).start();

    // Verify the changes exist in the new container
    const result = await newContainer.exec(["cat", "/test-file.txt"]);
    expect(result.output.trim()).toBe(testContent);

    // Cleanup
    await container.stop();
    await newContainer.stop();
  });

  it("should add session ID label when deleteOnExit is true", async () => {
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const container = await new GenericContainer(`${imageName}:${imageVersion}`).withExposedPorts(8080).start();

    // Commit with deleteOnExit true (default)
    const imageId = await container.commit({
      repo: imageName,
      tag: newImageTag,
    });

    // Verify session ID label is present
    const imageInfo = await getImageInfo(imageId);
    const client = await getContainerRuntimeClient();
    const reaper = await getReaper(client);
    expect(imageInfo.Config.Labels[LABEL_TESTCONTAINERS_SESSION_ID]).toBe(reaper.sessionId);

    await container.stop();
  });

  it("should not add session ID label when deleteOnExit is false", async () => {
    const newImageTag = `test-commit-${new RandomUuid().nextUuid()}`;
    const container = await new GenericContainer(`${imageName}:${imageVersion}`).withExposedPorts(8080).start();

    // Commit with deleteOnExit false
    const imageId = await container.commit({
      repo: imageName,
      tag: newImageTag,
      changes: ["LABEL test=test", "ENV test=test"],
      deleteOnExit: false,
    });

    const imageInfo = await getImageInfo(imageId);
    // Verify session ID label is not present
    expect(imageInfo.Config.Labels[LABEL_TESTCONTAINERS_SESSION_ID]).toBeFalsy();
    // Verify other changes are present
    expect(imageInfo.Config.Labels.test).toBe("test");
    expect(imageInfo.Config.Env).toContain("test=test");

    await container.stop();
    await deleteImageByName(imageId);
  });
});
