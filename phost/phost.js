/**
 * Handle all requests. Proxy requests with an pHost header and return 403
 * for everything else
 */
addEventListener("fetch", event => {
  const host = event.request.headers.get('phost');
  if (host) {
    const url = new URL(event.request.url);
    const originUrl = url.protocol + '//' + host + url.pathname + url.search;
    let init = {
      method: event.request.method,
      redirect: "manual",
      headers: [...event.request.headers]
    };
    event.respondWith(fetch(originUrl, init));
  } else {
    const response = new Response('Unauthorized: pHost headers missing', {status: 401, headers: {"x-phost-origin": null}});
    event.respondWith(response);
  }
});
