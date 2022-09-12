import { assertEquals } from "https://deno.land/std@0.155.0/testing/asserts.ts";
import { delay } from "https://deno.land/std@0.155.0/async/delay.ts";
import { flakyTest } from "https://deno.land/x/flaky_test@v1.0.2/mod.ts";

import { statusCodes } from "./src/status_code.ts";
import { earlyHintsResponse, withEarlyHints } from "./unstable.ts";

const nullBody = new Set([
  "204",
  "205",
  "301",
  "302",
  "303",
  "304",
  "307",
  "308",
]);

const statusCodeList = Object.keys(statusCodes);

for (const method of ["GET", "POST", "HEAD", "DELETE", "PUT"]) {
  for (const status of statusCodeList) {
    if (+status < 200) {
      continue;
    }
    Deno.test({
      name: `Method: ${method} / Status: ${status}`,
      fn: flakyTest(async () => {
        await delay(100);
        const body = nullBody.has(status) ? null : `[[status ${status}]]`;
        const controller = new AbortController();
        const serverPromise = Deno.serve(
          withEarlyHints(function* (_request) {
            yield earlyHintsResponse(["/style.css"]);
            return new Response(body, { status: +status });
          }),
          { signal: controller.signal, onListen: () => {} },
        );
        try {
          const res = await fetch("http://127.0.0.1:9000/", { method });
          const text = await res.text();
          assertEquals(res.status.toString(), status.toString());
          assertEquals(text, body == null || method === "HEAD" ? "" : body);
        } finally {
          controller.abort();
          await serverPromise;
        }
      }, { count: 10 }),
    });
  }
}
