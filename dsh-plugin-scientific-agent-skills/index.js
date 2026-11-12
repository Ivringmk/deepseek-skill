/**
 * dsh-plugin-scientific-agent-skills — DeepSeek Harness plugin bundle.
 *
 * Registers a `ctx.skills` provider that serves the 177 scientific/research
 * Agent Skills bundled under ./skills (K-Dense scientific-agent-skills,
 * adapted for DeepSeek). Install into a DSH profile with:
 *
 *   dsh plugin --profile web add github:Ivringmk/deepseek-skill#path:/dsh-plugin-scientific-agent-skills
 *
 * @module dsh-plugin-scientific-agent-skills
 */

import { readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Schema from "@deepseek-ai/schemastery";

export const name = "dsh-plugin-scientific-agent-skills";

export const inject = ["skills"];

/**
 * Rank 250 sits between DSH's project roots (100/200) and custom/user roots
 * (300-500): a project-level copy of a skill intentionally wins over the
 * bundle, while the bundle wins over user-level copies.
 */
const BUNDLE_RANK = 250;

const PROVIDER_NAME = "scientific-agent-skills-bundle";

export const Config = Schema.object({
  skillsDir: Schema.string().description(
    "Absolute path override for the directory that holds the skill folders. " +
      "Omit to use the skills bundled with this package.",
  ),
});

export function apply(ctx, config = {}) {
  // index.js lives at the package root; bundled skills sit alongside it.
  const packageDir = resolve(dirname(fileURLToPath(import.meta.url)));
  const baseDir = config.skillsDir
    ? resolve(config.skillsDir)
    : join(packageDir, "skills");

  return ctx.skills.registerProvider(() => createProvider(baseDir));
}

function createProvider(baseDir) {
  return {
    name: PROVIDER_NAME,

    async list() {
      const dirs = await skillDirs(baseDir);
      const out = [];
      for (const dir of dirs) {
        const parsed = readSkill(dir);
        if (parsed === null) continue;
        out.push({
          ...summaryFor(dir, parsed),
          rank: BUNDLE_RANK,
          locator: { path: join(dir, "SKILL.md") },
        });
      }
      return out;
    },

    async get(candidate, _options) {
      const path = candidate?.locator?.path;
      if (typeof path !== "string") return undefined;
      const dir = dirname(path);
      const parsed = readSkill(dir);
      if (parsed === null) return undefined;
      return {
        ...summaryFor(dir, parsed),
        content: parsed.body,
        path: join(dir, "SKILL.md"),
      };
    },
  };
}

async function skillDirs(baseDir) {
  if (!existsSync(baseDir)) return [];
  const entries = await readdir(baseDir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(baseDir, entry.name);
    if (existsSync(join(dir, "SKILL.md"))) out.push(dir);
  }
  return out.sort();
}

/**
 * Parse a SKILL.md: returns { name, description, body } or null when the
 * file is missing or lacks a parsable frontmatter.
 */
function readSkill(dir) {
  const file = join(dir, "SKILL.md");
  if (!existsSync(file)) return null;
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  const frontmatter = raw.slice(4, end);
  const body = raw.slice(raw.indexOf("\n", end + 1) + 1);

  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (!name || !description) return null;
  return { name, description, body };
}

function summaryFor(dir, parsed) {
  return {
    name: parsed.name,
    description: parsed.description,
    invocation: {
      modelInvocable: true,
      userInvocable: true,
    },
    source: "bundled",
    provider: PROVIDER_NAME,
    resourceBase: { kind: "directory", path: dir },
  };
}
