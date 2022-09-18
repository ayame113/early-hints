import { earlyHintsResponse, withEarlyHints } from "../unstable.ts";
import { contentType } from "https://deno.land/std@0.155.0/media_types/mod.ts";

Deno.serve(withEarlyHints(async function* (request) {
  const { pathname } = new URL(request.url);

  if (pathname === "/") {
    // sends early hints response
    yield earlyHintsResponse(["/style.css"]);

    // do some long task
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Please return the actual response at the end.
    return new Response(
      `<!DOCTYPE html><html><head><link rel="preload" as="style" href="/style.css"><link rel="stylesheet" href="/style.css"></head><body>hello world</body></html>`,
      {
        headers: { "Content-Type": contentType(".html") },
      },
    );
  } else if (pathname === "/style.css") {
    // do some long task
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Please return the actual response at the end.
    return new Response(
      "body{border: 1px solid black;}",
      {
        headers: { "Content-Type": contentType(".css") },
      },
    );
  }
  return new Response("404 Not Found", { status: 404 });
}));
