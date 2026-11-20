import { BuildOutput } from "./build-output";

describe("BuildOutput", () => {
  it("should not report a failure when the build has no error", () => {
    const buildOutput = new BuildOutput();

    buildOutput.add(JSON.stringify({ stream: "Step 1/1 : FROM alpine\n" }));

    expect(buildOutput.getFailure()).toBeUndefined();
  });

  it("should report the error with the build output", () => {
    const buildOutput = new BuildOutput();

    buildOutput.add(JSON.stringify({ stream: "Step 1/1 : RUN cat /does-not-exist" }));
    buildOutput.add(JSON.stringify({ stream: "\n" }));
    buildOutput.add(JSON.stringify({ stream: "\u001b[91mcat: can't open '/does-not-exist'\n\u001b[0m" }));
    buildOutput.add(JSON.stringify({ error: "exit code: 1", errorDetail: { message: "exit code: 1" } }));

    expect(buildOutput.getFailure()).toBe(
      "exit code: 1\n\nBuild output:\nStep 1/1 : RUN cat /does-not-exist\ncat: can't open '/does-not-exist'"
    );
  });

  it("should only keep the last lines of the build output", () => {
    const buildOutput = new BuildOutput();

    for (let i = 1; i <= 120; i++) {
      buildOutput.add(JSON.stringify({ stream: `line ${i}\n` }));
    }
    buildOutput.add(JSON.stringify({ error: "exit code: 1" }));

    const failure = buildOutput.getFailure()?.split("\n");
    expect(failure?.slice(0, 4)).toEqual(["exit code: 1", "", "Last 50 lines of build output:", "line 71"]);
    expect(failure).toHaveLength(53);
  });
});
