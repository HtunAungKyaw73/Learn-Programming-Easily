import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Load the committed Fraunces TTF for OG cards, or null if unavailable. */
export async function loadOgFont(): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), "assets/Fraunces-SemiBold.ttf"));
  } catch {
    return null;
  }
}
