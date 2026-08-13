import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ENTRIES = [
  "zola.toml",
  "config.toml",
  "content",
  "templates",
  "static",
  "sass",
  "themes",
  "i18n",
  "data",
];

function encodeMath(tex) {
  return Buffer.from(tex, "utf8").toString("base64");
}

function splitFrontMatter(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== "+++") {
    return { frontMatterLines: [], bodyLines: lines, hasFrontMatter: false };
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "+++");
  if (end === -1) {
    return { frontMatterLines: [], bodyLines: lines, hasFrontMatter: false };
  }

  return {
    frontMatterLines: lines.slice(1, end),
    bodyLines: lines.slice(end + 1),
    hasFrontMatter: true,
  };
}

function mathEnabled(frontMatterLines) {
  let section = "";

  for (const rawLine of frontMatterLines) {
    const line = rawLine.replace(/\s+#.*$/, "").trim();
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    if (section === "extra" && /^math\s*=\s*true\s*$/i.test(line)) {
      return true;
    }
  }

  return false;
}

function fenceOpening(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
  if (!match) return null;
  return { char: match[1][0], length: match[1].length };
}

function fenceClosing(line, fence) {
  const pattern = fence.char === "`" ? /^ {0,3}(`{3,})\s*$/ : /^ {0,3}(~{3,})\s*$/;
  const match = line.match(pattern);
  return Boolean(match && match[1].length >= fence.length);
}

function isEscaped(text, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i -= 1) {
    slashes += 1;
  }
  return slashes % 2 === 1;
}

function findInlineMathEnd(line, start) {
  for (let i = start + 1; i < line.length; i += 1) {
    if (line[i] !== "$" || isEscaped(line, i)) continue;
    if (line[i + 1] === "$" || /\s/.test(line[i - 1] ?? "")) continue;
    return i;
  }
  return -1;
}

function transformInlineMath(line) {
  let output = "";
  let i = 0;

  while (i < line.length) {
    if (line[i] === "`") {
      let run = 1;
      while (line[i + run] === "`") run += 1;
      const marker = "`".repeat(run);
      const end = line.indexOf(marker, i + run);
      if (end === -1) {
        output += line.slice(i);
        break;
      }
      output += line.slice(i, end + run);
      i = end + run;
      continue;
    }

    if (line[i] === "$" && line[i + 1] !== "$" && !isEscaped(line, i)) {
      const next = line[i + 1];
      if (next && !/\s/.test(next)) {
        const end = findInlineMathEnd(line, i);
        if (end !== -1) {
          const tex = line.slice(i + 1, end);
          output += `<span class="math-slot math-inline" data-math="${encodeMath(tex)}"></span>`;
          i = end + 1;
          continue;
        }
      }
    }

    output += line[i];
    i += 1;
  }

  return output;
}

function transformMathBody(bodyLines) {
  const output = [];
  let fence = null;

  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i];

    if (fence) {
      output.push(line);
      if (fenceClosing(line, fence)) fence = null;
      continue;
    }

    const opening = fenceOpening(line);
    if (opening) {
      fence = opening;
      output.push(line);
      continue;
    }

    if (line.trim() === "$$") {
      let end = i + 1;
      while (end < bodyLines.length && bodyLines[end].trim() !== "$$") {
        end += 1;
      }

      if (end < bodyLines.length) {
        const tex = bodyLines.slice(i + 1, end).join("\n").trim();
        output.push(`<div class="math-slot math-display" data-math="${encodeMath(tex)}"></div>`);
        i = end;
        continue;
      }
    }

    output.push(transformInlineMath(line));
  }

  return output;
}

export function preprocessMarkdown(source) {
  const { frontMatterLines, bodyLines, hasFrontMatter } = splitFrontMatter(source);
  if (!hasFrontMatter || !mathEnabled(frontMatterLines)) return source;

  const transformedBody = transformMathBody(bodyLines).join("\n");
  return `+++\n${frontMatterLines.join("\n")}\n+++\n${transformedBody}`;
}

function walkFiles(root, relative, files) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;

  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    files.set(relative, { mtimeMs: stat.mtimeMs, size: stat.size });
    return;
  }

  if (!stat.isDirectory()) return;
  for (const name of fs.readdirSync(absolute)) {
    walkFiles(root, path.join(relative, name), files);
  }
}

function scanProject(root) {
  const files = new Map();
  for (const entry of PROJECT_ENTRIES) {
    walkFiles(root, entry, files);
  }
  return files;
}

function copyProjectFile(root, stage, relative) {
  const source = path.join(root, relative);
  const target = path.join(stage, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (relative.startsWith(`content${path.sep}`) && relative.endsWith(".md")) {
    const markdown = fs.readFileSync(source, "utf8");
    fs.writeFileSync(target, preprocessMarkdown(markdown), "utf8");
  } else {
    fs.copyFileSync(source, target);
  }
}

function sameFileState(a, b) {
  return a && b && a.mtimeMs === b.mtimeMs && a.size === b.size;
}

function syncProject(root, stage, previous = new Map()) {
  const current = scanProject(root);

  for (const relative of previous.keys()) {
    if (!current.has(relative)) {
      fs.rmSync(path.join(stage, relative), { force: true });
    }
  }

  for (const [relative, state] of current) {
    if (!sameFileState(previous.get(relative), state)) {
      copyProjectFile(root, stage, relative);
    }
  }

  return current;
}

function parseCli(argv) {
  const [mode, ...rest] = argv;
  let zola = "zola";
  const forwarded = [];

  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--zola") {
      zola = rest[i + 1];
      i += 1;
    } else {
      forwarded.push(rest[i]);
    }
  }

  return { mode, zola, forwarded };
}

function cleanup(stage) {
  try {
    fs.rmSync(stage, { recursive: true, force: true });
  } catch {
    // The OS will eventually clean its temp directory even if this fails.
  }
}

function runBuild(root, stage, zola, forwarded) {
  const output = path.join(root, "public");
  const result = spawnSync(
    zola,
    ["--root", stage, "build", "--output-dir", output, "--force", ...forwarded],
    { cwd: root, stdio: "inherit" },
  );
  return result.status ?? 1;
}

function runServe(root, stage, zola, forwarded, initialState) {
  const child = spawn(zola, ["--root", stage, "serve", ...forwarded], {
    cwd: root,
    stdio: "inherit",
  });

  let state = initialState;
  const poller = setInterval(() => {
    try {
      state = syncProject(root, stage, state);
    } catch (error) {
      console.error(`[math-stage] ${error.message}`);
    }
  }, 400);

  const stop = (signal) => {
    if (!child.killed) child.kill(signal);
  };

  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));

  child.on("close", (code) => {
    clearInterval(poller);
    cleanup(stage);
    process.exit(code ?? 0);
  });
}

function main() {
  const { mode, zola, forwarded } = parseCli(process.argv.slice(2));
  if (mode !== "build" && mode !== "serve") {
    console.error("Usage: node scripts/site.mjs <build|serve> [--zola PATH] [zola options]");
    process.exit(2);
  }

  const root = process.cwd();
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "helmholtz-zola-"));
  const state = syncProject(root, stage);

  if (mode === "build") {
    const code = runBuild(root, stage, zola, forwarded);
    cleanup(stage);
    process.exit(code);
  }

  runServe(root, stage, zola, forwarded, state);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) main();
