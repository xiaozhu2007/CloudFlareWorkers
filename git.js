addEventListener("fetch", (event) => {
    event.respondWith(
        handleRequest(event.request).catch(
            (err) => new Response(`<h1>Github加速器遇到了致命错误</h1>
    <b>${err.stack}</b>`, {
                status: 500,
                headers: {
                    "content-type": "text/html; charset=utf-8",
                    "cache-control": "max-age=0, private, must-revalidate"
                }
            })
        )
    );
});

addEventListener('scheduled', event => {
    event.waitUntil(
        handleSchedule(event.scheduledTime)
    )
})

async function handleSchedule(scheduledDate) {
    console.log(scheduledDate)
}

async function handleRequest(request) {
    const {
        pathname,
        search
    } = new URL(request.url);
    console.log(new Map(request.headers))
    let response = await fetch(`https://github.com${pathname}${search}`)
    // Clone the response so that it's no longer immutable
    const newResponse = new Response(response.body, response);

    // Add a custom header with a value
    newResponse.headers.append('x-workers-hello', 'Hello from Cloudflare Workers');

    // Delete headers
    newResponse.headers.delete('etag');
    newResponse.headers.delete('permissions-policy');
    newResponse.headers.delete('set-cookie');
    newResponse.headers.delete('strict-transport-security');
    newResponse.headers.delete('vary');
    newResponse.headers.delete('x-frame-options');
    newResponse.headers.delete('content-security-policy');

    // Adjust the value for an existing header
    newResponse.headers.set('cache-control', 'max-age=60, private, must-revalidate');

    return newResponse;
}
