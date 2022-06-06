const CACHE_NAME = 'ICDNCache';
let cachelist = [];
self.cons = {
    s: (m) => {
        console.log(`%c[SUCCESS]%c ${m}`, 'color:white;background:green;', '')
    },
    w: (m) => {
        console.log(`%c[WARNING]%c ${m}`, 'color:brown;background:yellow;', '')
    },
    i: (m) => {
        console.log(`%c[INFO]%c ${m}`, 'color:white;background:blue;', '')
    },
    e: (m) => {
        console.log(`%c[ERROR]%c ${m}`, 'color:white;background:red;', '')
    },
    d: (m) => {
        console.log(`%c[DEBUG]%c ${m}`, 'color:white;background:black;', '')
    }
}
self.addEventListener('install', async function (installEvent) {
    self.skipWaiting();
    sw_ws({ type: "init", url: "wss://wss.pig2333.workers.dev" })
    wsc.onclose = () => {
        setTimeout(() => {
            sw_ws({ type: "init", url: "wss://wss.pig2333.workers.dev" })
        }, 1000);
    }
    installEvent.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                console.log('Opened cache');
                return cache.addAll(cachelist);
            })
    );
});
self.addEventListener('fetch', async event => {
    try {
        event.respondWith(handle(event.request))
    } catch (msg) {
        event.respondWith(handleerr(event.request, msg))
    }
});
self.addEventListener('active', async function (installEvent) {
    sw_ws({ type: "init", url: "wss://wss.pig2333.workers.dev" })
})
const handleerr = async (req, msg) => {
    return new Response(`<h1>CDN分流器遇到了致命错误</h1>
    <b>${msg}</b>`, { headers: { "content-type": "text/html; charset=utf-8" } })
}
let cdn = {
    "gh": {
        jsdelivr: {
            "url": "https://cdn.jsdelivr.net/gh"
        },
        jsdelivr_fastly: {
            "url": "https://fastly.jsdelivr.net/gh"
        },
        jsdelivr_gcore: {
            "url": "https://gcore.jsdelivr.net/gh"
        },
        pigax_jsd: {
            "url": "https://u.pigax.cn/gh"
        },
        pigax_chenyfan_jsd: {
            "url": "https://cdn-jsd.pigax.cn/gh"
        },
        tianli: {
            "url": "https://cdn1.tianli0.top/gh"
        }
    },
    "combine": {
        jsdelivr: {
            "url": "https://cdn.jsdelivr.net/combine"
        },
        jsdelivr_fastly: {
            "url": "https://fastly.jsdelivr.net/combine"
        },
        jsdelivr_gcore: {
            "url": "https://gcore.jsdelivr.net/combine"
        },
        pigax_jsd: {
            "url": "https://u.pigax.cn/combine"
        },
        pigax_chenyfan_jsd: {
            "url": "https://cdn-jsd.pigax.cn/combine"
        },
        tianli: {
            "url": "https://cdn1.tianli0.top/combine"
        }
    },
    "npm": {
        eleme: {
            "url": "https://npm.elemecdn.com"
        },
        jsdelivr: {
            "url": "https://cdn.jsdelivr.net/npm"
        },
        zhimg: {
            "url": "https://unpkg.zhimg.com"
        },
        unpkg: {
            "url": "https://unpkg.com"
        },
        bdstatic: {
            "url": "https://code.bdstatic.com/npm"
        },
        pigax_jsd: {
            "url": "https://u.pigax.cn/npm"
        },
        pigax_unpkg: {
            "url": "https://unpkg.pigax.cn/"
        },
        pigax_chenyfan_jsd: {
            "url": "https://cdn-jsd.pigax.cn/npm"
        },
        tianli: {
            "url": "https://cdn1.tianli0.top/npm"
        }

    }
}

const white_list = /^([a-zA-Z\d-_\*@]+\.|)+(github\.io|eurekac\.cn|stackoverflow\.com|github\.com)$/g

const proxy_endpoint = [
]

const handle = async function (req) {
    const urlStr = req.url
    const domain = (urlStr.split('/'))[2]
    let urls = []
    for (let i in cdn) {
        for (let j in cdn[i]) {
            if (domain == cdn[i][j].url.split('https://')[1].split('/')[0] && urlStr.match(cdn[i][j].url)) {
                urls = []
                for (let k in cdn[i]) {
                    urls.push(urlStr.replace(cdn[i][j].url, cdn[i][k].url))
                }
                if (urlStr.indexOf('@latest/') > -1) {
                    return lfetch(urls, urlStr)
                } else {
                    return caches.match(req).then(function (resp) {
                        return resp || lfetch(urls, urlStr).then(function (res) {
                            return caches.open(CACHE_NAME).then(function (cache) {
                                cache.put(req, res.clone());
                                return res;
                            });
                        });
                    })
                }
            }
        }
    }
    if (domain.match(white_list)) {
        let proxy_url = []
        proxy_url.push(urlStr)
        for (let i in proxy_endpoint) {
            proxy_url.push(urlStr.replace(domain, proxy_endpoint[i]))
        }
        const proxy_header = new Headers()

        for (let [key, value] of req.headers) {
            proxy_header.set(key, value)
        }
        proxy_header.set('c-origin', domain)
        proxy_header.set('c-type', 'CORS')
        return lfetch(proxy_url, urlStr, {
            method: req.method,
            headers: proxy_header,
            body: req.body
        }).then(function (res) {
            if (!res) { throw 'error' } //1
            return caches.open(CACHE_NAME).then(function (cache) {
                cache.delete(req);
                cache.put(req, res.clone());
                return res;
            });
        }).catch(function (err) {
            return caches.match(req).then(function (resp) {
                return resp || new Response('<h1>CDN分流器遇到了致命错误</h1>', { headers: { "content-type": "text/html; charset=utf-8" } })
            })
        })
    }

    return fetch(req)
}

const lfetch = async (urls, url, init) => {
    let controller = new AbortController();
    const PauseProgress = async (res) => {
        return new Response(await (res).arrayBuffer(), { status: res.status, headers: res.headers });
    };
    if (!Promise.any) {
        Promise.any = function (promises) {
            return new Promise((resolve, reject) => {
                promises = Array.isArray(promises) ? promises : []
                let len = promises.length
                let errs = []
                if (len === 0) return reject(new AggregateError('All promises were rejected'))
                promises.forEach((promise) => {
                    promise.then(value => {
                        resolve(value)
                    }, err => {
                        len--
                        errs.push(err)
                        if (len === 0) {
                            reject(new AggregateError(errs))
                        }
                    })
                })
            })
        }
    }
    return Promise.any(urls.map(urls => {
        init = init || {}
        init.signal = controller.signal
        return new Promise((resolve, reject) => {
            fetch(urls, init)
                .then(PauseProgress)
                .then(res => {
                    if (res.status < 500 ) {
                        controller.abort();
                        resolve(res)
                    } else {
                        reject(res)
                    }
                })
        })
    }))
}
const generate_uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const fullpath = (path) => {
    path = path.split('?')[0].split('#')[0]
    if (path.match(/\/$/)) {
        path += 'index'
    }
    if (!path.match(/\.[a-zA-Z]+$/)) {
        path += '.html'
    }
    return path
}

self.sw_ws = (config) => {
    switch (config.type) {
        case 'init':
            self.wsc = new WebSocket(config.url)
            break;
        case 'send':
            wsc.send(config.data)
            break;
        default:
            break
    }
}
