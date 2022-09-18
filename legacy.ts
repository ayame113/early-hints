import { serve } from "./vendor/deno.land/std@0.117.0/http/server_legacy.ts";
import { contentType } from "https://deno.land/std@0.155.0/media_types/mod.ts";

const body = "Hello World\n";
const server = serve({ port: 8000 });
for await (const req of server) {
  console.log(req.url);

  const pathname = req.url;

  if (pathname === "/") {
    // sends early hints response
    req.respond({
      status: 103,
      headers: new Headers([["Link", `</style.css>; rel=preload`]]),
    });

    // do some long task
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Please return the actual response at the end.
    req.respond({
      body:
        `<!DOCTYPE html><html><head><link rel="stylesheet" href="/style.css"></head><body>hello world</body></html>`,
      headers: new Headers([["Content-Type", contentType(".html")]]),
    });
  } else if (pathname === "/style.css") {
    // do some long task
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Please return the actual response at the end.
    req.respond({
      body: "body{border: 1px solid black;}",
      headers: new Headers([["Content-Type", contentType(".css")]]),
    });
  } else {
    req.respond({ status: 404 });
  }
}
