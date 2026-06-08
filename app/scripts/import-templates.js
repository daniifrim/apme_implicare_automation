#!/usr/bin/env node
// ABOUTME: Quick script to import email templates from filesystem into the database
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const templatesDir = path.join(__dirname, "..", "..", "docs", "email-templates");

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

function parseFilename(filename) {
  const nameWithoutExt = filename.replace(".txt", "");
  return {
    slug: slugify(nameWithoutExt),
    name: nameWithoutExt,
  };
}

function extractPlaceholders(content) {
  const matches = content.match(/\{\{[^{}]+\}\}/g);
  return matches ? [...new Set(matches.map((m) => m.slice(2, -2)))] : [];
}

function convertToBlockNote(content) {
  const paragraphs = content.split("\n").filter((line) => line.trim());

  const blocks = paragraphs.map((line) => {
    if (line.match(/^\s*•\s/)) {
      return {
        type: "bulletListItem",
        content: [{ type: "text", text: line.replace(/^\s*•\s/, "") }],
      };
    }

    if (line.match(/^\s*\d+\.\s/)) {
      return {
        type: "numberedListItem",
        content: [{ type: "text", text: line.replace(/^\s*\d+\.\s/, "") }],
      };
    }

    const segments = [];
    let lastIndex = 0;
    const placeholderRegex = /\{\{[^{}]+\}\}/g;
    let match;

    while ((match = placeholderRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", text: line.slice(lastIndex, match.index) });
      }
      segments.push({ type: "text", text: match[0], marks: [{ type: "placeholder" }] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      segments.push({ type: "text", text: line.slice(lastIndex) });
    }

    return {
      type: "paragraph",
      content: segments.length > 0 ? segments : [{ type: "text", text: "" }],
    };
  });

  return blocks;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function ensureEnvLoaded(appDir) {
  loadEnvFile(path.join(appDir, ".env"));
  loadEnvFile(path.join(appDir, ".env.local"));
}

async function main() {
  const appDir = path.resolve(__dirname, "..");
  ensureEnvLoaded(appDir);

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const files = fs.readdirSync(templatesDir);
    const txtFiles = files.filter((f) => f.endsWith(".txt"));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const filename of txtFiles) {
      try {
        const { slug, name } = parseFilename(filename);
        const content = fs.readFileSync(path.join(templatesDir, filename), "utf-8");

        const existing = await prisma.template.findUnique({ where: { slug } });
        if (existing) {
          skipped++;
          continue;
        }

        const editorState = convertToBlockNote(content);
        const htmlContent = content
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            if (line.match(/^\s*•\s/)) return `<li>${line.replace(/^\s*•\s/, "")}</li>`;
            if (line.match(/^\s*\d+\.\s/)) return `<li>${line.replace(/^\s*\d+\.\s/, "")}</li>`;
            return `<p>${line}</p>`;
          })
          .join("");

        const placeholders = extractPlaceholders(content).map((p) => `{{${p}}}`);

        await prisma.template.create({
          data: {
            slug,
            name,
            description: `Imported from ${filename}`,
            status: "draft",
            tags: ["imported"],
            versions: {
              create: {
                versionNumber: 1,
                name: "Initial Version",
                subject: name,
                preheader: "",
                editorState: editorState,
                htmlContent,
                textContent: content,
                placeholders,
                isPublished: false,
              },
            },
          },
        });

        imported++;
        console.log(`Imported: ${name}`);
      } catch (error) {
        errors.push(`Failed to import ${filename}: ${error.message}`);
        console.error(`Error importing ${filename}:`, error.message);
      }
    }

    console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
