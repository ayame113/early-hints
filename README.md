# early-hints

A library that uses Deno's
[flash server](https://github.com/denoland/deno/tree/main/ext/flash)
(experimental) to serve 103 Early Hints.

```ts
import { earlyHintsResponse, withEarlyHints } from "./unstable.ts";

Deno.serve(withEarlyHints(function* (_request) {
  yield earlyHintsResponse(["/style.css"]);
  return new Response("aaa");
}));
```

related: https://github.com/denoland/deno/issues/15827
