import { earlyHintsResponse, withEarlyHints } from "../unstable.ts";
import { contentType } from "https://deno.land/std@0.173.0/media_types/mod.ts";

Deno.serve(withEarlyHints(async function* (_request) {
  // sends early hints response
  yield earlyHintsResponse(["/style.css"]);

  // do some long task
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Please return the actual response at the end.
  return new Response("<!DOCTYPE html><html><body>hello world</body></html>", {
    headers: { "Content-Type": contentType(".html") },
  });
}));
