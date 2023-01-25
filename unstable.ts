import { statusCodes } from "./src/status_code.ts";
import { writeAll } from "https://deno.land/std@0.173.0/streams/mod.ts";

export type ResponseObject = Pick<Response, "headers" | "status" | "body">;
export type Handler = (
  req: Request,
) =>
  | AsyncGenerator<ResponseObject, ResponseObject, unknown>
  | Generator<ResponseObject, ResponseObject, unknown>;

const encoder = new TextEncoder();

/**
 * @deprecated
 *
 * Create a 103 Early Hints response.
 *
 * The native Response object currently does not allow the creation of 103 Early Hints responses. This function creates a pseudo-response object that can **only** be used within this library.
 *
 * ```ts
 * import { earlyHintsResponse } from "https://deno.land/x/103_early_hints@$VERSION/unstable.ts"
 *
 * const hintResponse = earlyHintsResponse(["/style.css", "https://foo.com/bar"]);
 * ```
 */
export function earlyHintsResponse(pathList: string[]): ResponseObject {
  return {
    headers: new Headers([[
      "Link",
      pathList.map((path) => `<${path}>; rel=preload`).join(", "),
    ]]),
    status: 103,
    body: null,
  };
}

/**
 * @deprecated
 *
 * Create a server that can return 103 Early Hints. Use with `Deno.serve()`.
 *
 * This function is experimental and unstable.
 *
 * ```ts
 * import { earlyHintsResponse, withEarlyHints } from "https://deno.land/x/103_early_hints@$VERSION/unstable.ts";
 * import { contentType } from "https://deno.land/std@0.173.0/media_types/mod.ts";
 *
 * Deno.serve(withEarlyHints(async function* (_request) {
 *   // sends early hints response
 *   yield earlyHintsResponse(["/style.css"]);
 *
 *   // do some long task
 *   await new Promise((resolve) => setTimeout(resolve, 1000));
 *
 *   // Please return the actual response at the end.
 *   return new Response("<!DOCTYPE html><html><body>hello world</body></html>", {
 *     headers: { "Content-Type": contentType(".html") },
 *   });
 * }));
 * ```
 */
export function withEarlyHints(handler: Handler): Deno.ServeHandler {
  return (async (req: Request) => {
    const [conn, _firstPacket] = Deno.upgradeHttpRaw(req);

    let waiter = Promise.resolve();
    const iter = handler(req);
    while (true) {
      const { done, value } = await iter.next();
      waiter = waiter.then(async () =>
        await writeHttp1Response(conn, req.method, value)
      );
      if (done) {
        break;
      }
    }

    await waiter.then(() => conn.close()); // resolve when all finished
  }) as unknown as Deno.ServeHandler;
}

// https://github.com/denoland/deno/blob/ffffa2f7c44bd26aec5ae1957e0534487d099f48/ext/flash/01_http.js

async function writeHttp1Response(
  writer: Deno.Writer,
  method: string,
  response: ResponseObject,
) {
  const str = createHeader(method, response);
  await writeAll(writer, encoder.encode(str));

  if (response.body) {
    for await (const chunk of response.body) {
      await writeAll(
        writer,
        encoder.encode(`${chunk.byteLength.toString(16)}\r\n`),
      );
      await writeAll(writer, chunk);
      await writeAll(writer, encoder.encode("\r\n"));
    }
    await writeAll(writer, encoder.encode("0\r\n\r\n"));
  }
}

// Construct an HTTP response message.
// All HTTP/1.1 messages consist of a start-line followed by a sequence
// of octets.
//
//  HTTP-message = start-line
//    *( header-field CRLF )
//    CRLF
//    [ message-body ]
//
// todo avoid header injection
function createHeader(method: string, response: ResponseObject): string {
  const { status, headers, body } = response;
  // HTTP uses a "<major>.<minor>" numbering scheme
  //   HTTP-version  = HTTP-name "/" DIGIT "." DIGIT
  //   HTTP-name     = %x48.54.54.50 ; "HTTP", case-sensitive
  //
  // status-line = HTTP-version SP status-code SP reason-phrase CRLF
  // Date header: https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.2
  let str = `HTTP/1.1 ${status} ${statusCodes[status]}\r\n`;
  if (200 <= status) {
    const date = new Date().toUTCString();
    str += `Date: ${date}\r\n`;
  }

  for (const [name, value] of headers) {
    // header-field   = field-name ":" OWS field-value OWS
    str += `${name}: ${value}\r\n`;
  }

  // https://datatracker.ietf.org/doc/html/rfc7231#section-6.3.6
  if (status === 205 || status === 304) {
    // MUST NOT generate a payload in a 205 response.
    // indicate a zero-length body for the response by
    // including a Content-Length header field with a value of 0.
    str += "Content-Length: 0\r\n\r\n";
    return str;
  }

  // MUST NOT send Content-Length or Transfer-Encoding if status code is 1xx or 204.
  if (status == 204 || status < 200) {
    return str + "\r\n";
  }

  // A HEAD request.
  if (method.toUpperCase() === "HEAD") return str + "\r\n";

  // null body status is validated by inititalizeAResponse in ext/fetch
  if (body == null) {
    str += `Content-Length: 0\r\n\r\n`;
  } else {
    str += "Transfer-Encoding: chunked\r\n\r\n";
  }
  return str;
}
