import { earlyHintsResponse, withEarlyHints } from "../unstable.ts";

Deno.serve(withEarlyHints(function* (_request) {
  yield earlyHintsResponse(["/style.css"]);
  return new Response("aaa");
}));
