import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

/** 构建时把 data/moments 快照拷到 public，供同源回退读取 */
const source = path.resolve("data/moments");
const target = path.resolve("public/moments-data");

await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Synced ${source} -> ${target}`);
