import { promises as fs } from "node:fs";
import { log } from "../common";
import { ImageName } from "../container-runtime";
import type { BuildArgs } from "../types";

const buildArgRegex = /\${([^{]+)}/g;

export async function getDockerfileImages(dockerfile: string, buildArgs: BuildArgs): Promise<ImageName[]> {
  try {
    const { images, argDefaults } = parseImages(await fs.readFile(dockerfile, "utf8"));
    const args = { ...argDefaults, ...buildArgs };
    return images
      .map((image) => image.replace(buildArgRegex, (_, arg) => args[arg] ?? ""))
      .map((image) => ImageName.fromString(image.trim()));
  } catch (err) {
    log.error(`Failed to read Dockerfile "${dockerfile}": ${err}`);
    throw err;
  }
}

function parseImages(dockerfile: string): { images: string[]; argDefaults: BuildArgs } {
  const images = new Set<string>();
  const argDefaults: BuildArgs = {};

  for (const [instruction, ...args] of parseInstructions(dockerfile)) {
    const keyword = instruction.toUpperCase();
    if (keyword === "FROM") {
      const image = args.find((arg) => !arg.startsWith("--"));
      if (image) {
        images.add(image);
      }
    } else if (keyword === "ARG" && images.size === 0) {
      // Only ARGs declared before the first FROM can be used in FROM lines
      Object.assign(argDefaults, parseArgDefaults(args));
    }
  }

  return { images: Array.from(images), argDefaults };
}

function parseArgDefaults(args: string[]): BuildArgs {
  return Object.fromEntries(
    args
      .filter((arg) => arg.includes("="))
      .map((arg) => {
        const [name, ...value] = arg.split("=");
        return [name, value.join("=").replace(/^(["'])(.*)\1$/, "$2")];
      })
  );
}

function parseInstructions(dockerfile: string): string[][] {
  const lines = dockerfile.split(/\r?\n/).map((line) => line.trim());
  const escapeCharacter = getEscapeCharacter(lines);
  const instructions: string[] = [];
  let continued = "";

  for (const line of lines) {
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    if (line.endsWith(escapeCharacter)) {
      continued += `${line.slice(0, -1)} `;
      continue;
    }
    instructions.push(`${continued}${line}`);
    continued = "";
  }
  if (continued !== "") {
    instructions.push(continued);
  }

  return instructions.map((instruction) => instruction.trim().split(/\s+/));
}

function getEscapeCharacter(lines: string[]): string {
  for (const line of lines) {
    const directive = /^#\s*(\w+)\s*=\s*(\S*)$/.exec(line);
    if (!directive) {
      break;
    }
    if (directive[1].toLowerCase() === "escape" && directive[2] === "`") {
      return "`";
    }
  }
  return "\\";
}
