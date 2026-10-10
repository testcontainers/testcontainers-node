// Builds packages with their publish config, packs them, and checks the tarballs we would publish.
// Run it through `npm run check-packages [-- <package>...]`, which puts the pinned publint and attw on PATH.
// Package names match the CI matrix: "testcontainers" or a directory name under packages/modules.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const testOnlyFiles = [
  /\.(test|spec)\.[^/]+$/,
  /(^|[/._-])test[-_]?(helpers?|utils?)[^/]*$/i,
  /(^|\/)(fixtures|__tests__|__mocks__)\//,
];

const workspacePath = (name) => (name === "testcontainers" ? "packages/testcontainers" : `packages/modules/${name}`);

const allPackages = () => {
  const modulesDir = resolve(rootDir, "packages/modules");
  const modules = readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(resolve(modulesDir, entry.name, "package.json")))
    .map((entry) => entry.name);
  return ["testcontainers", ...modules.sort()];
};

const run = (command, args, { capture = false } = {}) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  return { ok: result.status === 0, stdout: result.stdout };
};

const build = (name) => {
  const packageDir = resolve(rootDir, workspacePath(name));

  // Start clean: `check-compiles` emits tests into the same build directory, and tsc does not re-emit
  // files that its tsbuildinfo considers up to date.
  rmSync(resolve(packageDir, "build"), { recursive: true, force: true });
  for (const file of readdirSync(packageDir).filter((file) => file.endsWith(".tsbuildinfo"))) {
    rmSync(resolve(packageDir, file));
  }

  if (!run("npm", ["run", "build", "--workspace", workspacePath(name)]).ok) {
    throw new Error(`Failed to build ${name}`);
  }
};

const check = (name, packDir) => {
  const errors = [];

  const pack = run("npm", ["pack", "--workspace", workspacePath(name), "--pack-destination", packDir, "--json"], {
    capture: true,
  });
  if (!pack.ok) {
    return ["npm pack failed"];
  }
  const [{ filename, files }] = JSON.parse(pack.stdout);
  const tarball = join(packDir, filename);

  const testFiles = files.map((file) => file.path).filter((path) => testOnlyFiles.some((re) => re.test(path)));
  if (testFiles.length > 0) {
    console.error(`Test-only files in the tarball:\n${testFiles.map((path) => `  ${path}`).join("\n")}`);
    errors.push("test-only files are packed (exclude them in tsconfig.build.json)");
  }

  if (!run("publint", ["run", tarball, "--strict"]).ok) {
    errors.push("publint");
  }

  // Check only the types we ship, not any @types package of the same name on the registry.
  if (!run("attw", [tarball, "--no-definitely-typed"]).ok) {
    errors.push("attw");
  }

  return errors;
};

const packages = process.argv.length > 2 ? process.argv.slice(2) : allPackages();
const unknown = packages.filter((name) => !existsSync(resolve(rootDir, workspacePath(name), "package.json")));
if (unknown.length > 0) {
  console.error(`Unknown packages: ${unknown.join(", ")}`);
  process.exit(1);
}

// Modules compile against the core build output through project references, so core is built first.
for (const name of new Set(["testcontainers", ...packages])) {
  build(name);
}

const packDir = mkdtempSync(join(tmpdir(), "testcontainers-packages-"));
const failures = [];
try {
  for (const name of packages) {
    console.log(`\n=== ${name} ===`);
    const errors = check(name, packDir);
    if (errors.length > 0) {
      failures.push(`${name}: ${errors.join(", ")}`);
    }
  }
} finally {
  rmSync(packDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nPackage checks failed:\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nPackage checks passed for ${packages.length} package(s).`);
