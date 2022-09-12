# early-hints

[![ci](https://github.com/ayame113/early-hints/actions/workflows/ci.yml/badge.svg)](https://github.com/ayame113/early-hints/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ayame113/early-hints/branch/main/graph/badge.svg?token=fd7I1uUnCn)](https://codecov.io/gh/ayame113/early-hints)

https://deno.land/x/103_early_hints

A library that uses Deno's
[flash server](https://github.com/denoland/deno/tree/main/ext/flash)
(experimental) to serve 103 Early Hints.

> **Note** See [here](https://dev.to/qainsights/what-is-http-103-1l26) for 103
> Early Hints.

```ts
import { contentType } from "https://deno.land/std@0.155.0/media_types/mod.ts";
import {
  earlyHintsResponse,
  withEarlyHints,
} from "https://deno.land/x/103_early_hints@$VERSION/unstable.ts";

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
```

> **Warning** Deno flash server (`Deno.serve()``) is an unstable API (as of
> v1.25). The API may change and stop working.

> **Warning** This library manually implements the HTTP/1.1 protocol. (Look at
> the [source code](./unstable.ts)!) I'm testing it, but it may contain bugs.
> Also, don't expect performance.

> **Warning** I am currently using a generator to return multiple responses.
> However, we may change how we use it in the future.

related: https://github.com/denoland/deno/issues/15827
