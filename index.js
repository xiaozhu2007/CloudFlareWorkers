const base = 'https://git.pig2333.workers.dev';
const statusCode = 302;

async function handleRequest(request) {
  const url = new URL(request.url);
  const { pathname, search } = url;
  const destinationURL = base + pathname + search;
  return Response.redirect(destinationURL, statusCode);
}

addEventListener('fetch', async event => {
  event.respondWith(handleRequest(event.request));
});
