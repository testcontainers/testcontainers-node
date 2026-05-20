import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const ignoredPaths = [
  /^README\.md$/,
  /^docs\//,
  /^mkdocs\.yml$/,
  /^\.github\/FUNDING\.yml$/,
  /^\.github\/ISSUE_TEMPLATE\//,
  /^\.github\/release-drafter\.yml$/,
];

const allPackagesPaths = [
  /^packages\/testcontainers\//,
  /^package(-lock)?\.json$/,
  /^tsconfig\.base\.json$/,
  /^eslint\.config\.js$/,
  /^vitest\.config\.ts$/,
  /^\.npmrc$/,
  /^\.github\/actions\//,
  /^\.github\/scripts\//,
  /^\.github\/workflows\/(checks|test-template)\.yml$/,
];

const changedFiles = readFileSync(0, "utf8")
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const modulesDir = resolve(rootDir, "packages/modules");
const moduleNames = new Set(
  readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(resolve(modulesDir, entry.name, "package.json")))
    .map((entry) => entry.name)
);

const allPackages = () => ["testcontainers", ...moduleNames].sort();
const selectedPackages = new Set();

for (const file of changedFiles) {
  if (ignoredPaths.some((pattern) => pattern.test(file))) {
    continue;
  }

  const moduleMatch = file.match(/^packages\/modules\/([^/]+)\//);
  if (moduleMatch) {
    const moduleName = moduleMatch[1];
    if (moduleNames.has(moduleName)) {
      selectedPackages.add(moduleName);
    }
    continue;
  }

  if (allPackagesPaths.some((pattern) => pattern.test(file))) {
    process.stdout.write(`${JSON.stringify(allPackages())}\n`);
    process.exit(0);
  }
}

process.stdout.write(`${JSON.stringify([...selectedPackages].sort())}\n`);
