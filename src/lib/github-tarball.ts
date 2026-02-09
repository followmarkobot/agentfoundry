import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import tar from "tar-stream";

export interface ExtractedFile {
  path: string;
  content: string;
}

/**
 * Download and stream-extract a GitHub repo tarball.
 * Returns only files that pass the filter function.
 * Streams to keep memory low on Vercel serverless.
 */
export async function fetchRepoFiles(
  owner: string,
  repo: string,
  token: string,
  shouldInclude: (path: string) => boolean,
  maxFiles: number = 100,
  maxFileSize: number = 256 * 1024 // 256KB per file
): Promise<{ files: ExtractedFile[]; totalFiles: number }> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/tarball`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      redirect: "follow",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch tarball: ${res.status} ${res.statusText}`);
  }

  const files: ExtractedFile[] = [];
  let totalFiles = 0;

  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const gunzip = createGunzip();

    extract.on("entry", (header, stream, next) => {
      // Tarball paths start with "{owner}-{repo}-{sha}/" — strip the prefix
      const fullPath = header.name;
      const slashIdx = fullPath.indexOf("/");
      const relativePath = slashIdx >= 0 ? fullPath.slice(slashIdx + 1) : fullPath;

      if (header.type === "file" && relativePath) {
        totalFiles++;

        if (files.length < maxFiles && shouldInclude(relativePath)) {
          const chunks: Buffer[] = [];
          let size = 0;

          stream.on("data", (chunk: Buffer) => {
            if (size < maxFileSize) {
              chunks.push(chunk);
              size += chunk.length;
            }
          });

          stream.on("end", () => {
            const content = Buffer.concat(chunks).toString("utf8").slice(0, maxFileSize);
            files.push({ path: relativePath, content });
            next();
          });
        } else {
          stream.resume();
          stream.on("end", next);
        }
      } else {
        stream.resume();
        stream.on("end", next);
      }
    });

    extract.on("finish", () => resolve({ files, totalFiles }));
    extract.on("error", reject);
    gunzip.on("error", reject);

    // Pipe: response body -> gunzip -> tar extract
    const body = res.body;
    if (!body) {
      reject(new Error("No response body"));
      return;
    }

    // Convert web ReadableStream to Node Readable
    const nodeStream = Readable.fromWeb(body as import("stream/web").ReadableStream);
    nodeStream.pipe(gunzip).pipe(extract);
  });
}
