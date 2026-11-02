import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const brokenCall = 'e.proto("__"+o,n.randomUUID(),i,s)';
const fixedCall = 'e.proto("__"+o,"cb_"+n.randomUUID().replaceAll("-","_"),i,s)';
const root = path.resolve("node_modules/vite-plugin-font/node_modules/cn-font-split");

async function collectHelpers(dir, found) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectHelpers(fullPath, found);
      continue;
    }
    if (entry.name === "helper.js" && fullPath.includes(`${path.sep}koffi${path.sep}`)) {
      found.push(fullPath);
    }
  }
}

const helpers = [];
await collectHelpers(root, helpers);

if (helpers.length === 0) {
  console.log("font ffi patch: helper.js not found, skip");
  process.exit(0);
}

for (const filePath of helpers) {
  const source = await readFile(filePath, "utf8");
  if (!source.includes(brokenCall)) {
    console.log(`font ffi patch: already ok ${path.relative(process.cwd(), filePath)}`);
    continue;
  }

  await writeFile(filePath, source.replace(brokenCall, fixedCall));
  console.log(`font ffi patch: updated ${path.relative(process.cwd(), filePath)}`);
}
