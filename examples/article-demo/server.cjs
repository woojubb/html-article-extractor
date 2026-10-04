'use strict'

const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { JSDOM } = require('jsdom')
const getArticle = require('html-article-extractor')

const PORT = Number(process.env.PORT || 8975)
const MAX_BYTES = 5_000_000
const TIMEOUT_MS = 20_000
const ROOT = __dirname

const PRESETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'links.json'), 'utf8'))

function sendJson (res, status, value) {
    const body = JSON.stringify(value)
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(body)
}

function sniffCharset (buffer) {
    const bytes = new Uint8Array(buffer)
    if (bytes.length >= 2) {
        if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
            return 'utf-16le'
        }
        if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
            return 'utf-16be'
        }
    }
    const head = Array.from(bytes.slice(0, 4096)).map(function (byte) {
        return String.fromCharCode(byte)
    }).join('')
    return head.match(/<meta[^>]+charset\s*=\s*["']?([^"'>\s;]+)/i)?.[1]?.trim() ||
        head.match(/<\?xml[^>]+encoding\s*=\s*["']([^"']+)/i)?.[1]?.trim() ||
        null
}

function decodeBody (buffer, contentType) {
    const headerCharset = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]
    const charset = headerCharset || sniffCharset(buffer) || 'utf-8'
    try {
        return new TextDecoder(charset).decode(buffer)
    } catch {
        return new TextDecoder('utf-8').decode(buffer)
    }
}

async function extractFromUrl (input) {
    let url
    try {
        url = new URL(input)
    } catch {
        throw new Error('URL 형식이 올바르지 않습니다.')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('HTTP/HTTPS URL만 입력할 수 있습니다.')
    }

    const started = Date.now()
    const response = await fetch(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!response.ok) {
        throw new Error(`요청 실패: HTTP ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
        throw new Error('응답이 5MB를 초과합니다.')
    }
    const html = decodeBody(buffer, response.headers.get('content-type'))
    const document = new JSDOM(html, { url: response.url || url.toString() }).window.document
    const article = getArticle(document)
    if (!article.text) {
        throw new Error('본문을 찾지 못했습니다.')
    }
    return {
        url: response.url || url.toString(),
        fetchMs: Date.now() - started,
        bytes: buffer.byteLength,
        textChars: article.text.length,
        text: article.text,
        html: article.html
    }
}

const server = http.createServer(function (req, res) {
    const requestUrl = new URL(req.url || '/', 'http://localhost')
    if (requestUrl.pathname === '/api/links') {
        sendJson(res, 200, PRESETS)
        return
    }
    if (requestUrl.pathname === '/api/extract') {
        const target = requestUrl.searchParams.get('url') || ''
        extractFromUrl(target).then(function (result) {
            sendJson(res, 200, { ok: true, ...result })
        }).catch(function (error) {
            const message = error instanceof Error ? error.message : String(error)
            sendJson(res, 200, { ok: false, error: message })
        })
        return
    }
    if (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html') {
        const page = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8')
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(page)
        return
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found')
})

server.listen(PORT, function () {
    process.stdout.write(`article-demo listening on http://127.0.0.1:${PORT}\n`)
})
