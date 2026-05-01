import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharpFn = (input: string) => any;

let _sharp: SharpFn | null | undefined = undefined;

function getSharp(): SharpFn | null {
  if (_sharp !== undefined) return _sharp;
  try {
    // Dynamic require so the module stays optional — callers should guard with isSharpAvailable()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sharp = require("sharp") as SharpFn;
  } catch {
    _sharp = null;
  }
  return _sharp;
}

/**
 * Returns true if the `sharp` native module is available in this environment.
 */
export function isSharpAvailable(): boolean {
  return getSharp() !== null;
}

/**
 * Converts a single-frame image to AVIF using sharp (libvips).
 * Fast encoding with effort 3–4. Returns the output .avif path.
 */
export async function convertStillToAvif(
  inputPath: string,
  effort = 4,
  quality = 50,
): Promise<string> {
  const sharp = getSharp();
  if (!sharp) throw new Error("sharp is not available");
  const outputPath = path.join(
    path.dirname(inputPath),
    path.basename(inputPath, path.extname(inputPath)) + ".avif",
  );
  await sharp(inputPath).avif({ effort, quality }).toFile(outputPath);
  return outputPath;
}
