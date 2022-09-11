// import { serve } from "https://deno.land/std@0.154.0/http/mod.ts";
// import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.1/mod.ts";
//
// serve((req) => serveDirWithTs(req));

import { writeAll } from "https://deno.land/std@0.154.0/streams/mod.ts";

const encoder = new TextEncoder();
const ok = (body: string) => {
  const { byteLength } = encoder.encode(body);
  const text = [
    "HTTP/1.1 103 Early Hints",
    "Link: </style.css>; rel=preload",
    "Link: </script.js>; rel=preload",
    "",
    "",
    "HTTP/1.1 200 OK",
    "Content-Type: text/plain",
    `Content-Length: ${byteLength}`,
    "",
    body,
    "",
  ].map((str) => `${str}\r\n`).join("");
  return encoder.encode(text);
};

Deno.serve(withEarlyHints(async function* (request) {
  yield new Response("103");
  return new Response("aaa");
}));

function withEarlyHints(
  handler: (req: Request) => AsyncGenerator<Response, Response, unknown>,
): Deno.ServeHandler {
  return (async (req: Request) => {
    const [conn, _firstPacket] = Deno.upgradeHttpRaw(req);

    let waiter = Promise.resolve();
    for await (const response of handler(req)) {
      waiter = waiter.then(async () => {
        const str = responseToString(response);
        await writeAll(conn, encoder.encode(str));
      });
    }
    await waiter.then(() => {
      conn.close();
    }); // resolve when all finished
  }) as unknown as Deno.ServeHandler;
}

function responseToString(res: Response): string {}

// https://github.com/denoland/deno/blob/ffffa2f7c44bd26aec5ae1957e0534487d099f48/ext/flash/01_http.js

// Construct an HTTP response message.
// All HTTP/1.1 messages consist of a start-line followed by a sequence
// of octets.
//
//  HTTP-message = start-line
//    *( header-field CRLF )
//    CRLF
//    [ message-body ]
//
function http1Response(method: string, response: Response) {
  const { status, headers, body } = response;
  // HTTP uses a "<major>.<minor>" numbering scheme
  //   HTTP-version  = HTTP-name "/" DIGIT "." DIGIT
  //   HTTP-name     = %x48.54.54.50 ; "HTTP", case-sensitive
  //
  // status-line = HTTP-version SP status-code SP reason-phrase CRLF
  // Date header: https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.2
  let str = `HTTP/1.1 ${status} ${statusCodes[status]}\r\nDate: ${date}\r\n`;
  for (const [name, value] of headerList) {
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
  if (status == 204 && status <= 100) {
    return str;
  }

  if (earlyEnd === true) {
    return str;
  }

  // null body status is validated by inititalizeAResponse in ext/fetch
  if (body !== null && body !== undefined) {
    str += `Content-Length: ${bodyLen}\r\n\r\n`;
  } else {
    str += "Transfer-Encoding: chunked\r\n\r\n";
    return str;
  }

  // A HEAD request.
  if (method === 1) return str;

  if (typeof body === "string") {
    str += body ?? "";
  } else {
    const head = core.encode(str);
    const response = new Uint8Array(head.byteLength + body.byteLength);
    response.set(head, 0);
    response.set(body, head.byteLength);
    return response;
  }

  return str;
}
