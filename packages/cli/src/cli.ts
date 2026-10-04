import { JSDOM } from 'jsdom'
import getArticle from 'html-article-extractor'

type OutputFormat = 'html' | 'json' | 'text'

interface WritableOutput {
    write: (chunk: string) => unknown
}

export interface CliDependencies {
    fetch: typeof fetch
    stdout: WritableOutput
}

interface CliOptions {
    format: OutputFormat
    help: boolean
    url?: string
}

const USAGE = `Usage: html-article-extractor [--json|--text|--html] <url>

Fetch a web page and extract its primary article content.

Options:
  --json    Print both HTML and normalized text (default)
  --text    Print normalized article text
  --html    Print extracted article HTML
  -h, --help  Show this help
`

const MAX_RESPONSE_BYTES = 5_000_000
const FETCH_TIMEOUT_MS = 15_000

export async function run (
    argv: string[],
    dependencies: CliDependencies = { fetch: globalThis.fetch, stdout: process.stdout }
): Promise<number> {
    const options = parseArguments(argv)
    if (options.help) {
        dependencies.stdout.write(USAGE)
        return 0
    }
    if (!options.url) {
        throw new Error('A URL is required. Use --help for usage.')
    }

    const url = validateUrl(options.url)
    const response = await dependencies.fetch(url, {
        headers: {
            'user-agent': 'html-article-extractor/1.1 (+https://github.com/jungyoun/html-article-extractor)'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
    if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
        throw new Error('Response body exceeds the 5 MB limit.')
    }
    const html = decodeResponse(buffer, response.headers.get('content-type'))
    const document = new JSDOM(html, { url: response.url || url.toString() }).window.document
    const article = getArticle(document)

    if (!article.text) {
        throw new Error('No article content was found.')
    }

    dependencies.stdout.write(formatArticle(article, options.format))
    return 0
}

function parseArguments (argv: string[]): CliOptions {
    let format: OutputFormat = 'json'
    let help = false
    let url: string | undefined

    for (const argument of argv) {
        if (argument === '--json') {
            format = 'json'
        } else if (argument === '--text') {
            format = 'text'
        } else if (argument === '--html') {
            format = 'html'
        } else if (argument === '--help' || argument === '-h') {
            help = true
        } else if (argument.startsWith('-')) {
            throw new Error(`Unknown option: ${argument}`)
        } else if (url) {
            throw new Error('Only one URL can be processed at a time.')
        } else {
            url = argument
        }
    }

    return { format, help, url }
}

function validateUrl (input: string): URL {
    const url = new URL(input)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS URLs are supported.')
    }
    return url
}

function decodeResponse (buffer: ArrayBuffer, contentType: string | null): string {
    const headerCharset = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]
    const charset = headerCharset || sniffCharset(buffer) || 'utf-8'
    try {
        return new TextDecoder(charset).decode(buffer)
    } catch {
        return new TextDecoder('utf-8').decode(buffer)
    }
}

function sniffCharset (buffer: ArrayBuffer): string | null {
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
    const meta = head.match(/<meta[^>]+charset\s*=\s*["']?([^"'>\s;]+)/i)?.[1] ||
        head.match(/<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^"';\s]+)/i)?.[1] ||
        head.match(/<\?xml[^>]+encoding\s*=\s*["']([^"']+)/i)?.[1]
    return meta?.trim() || null
}

function formatArticle (article: { html: string, text: string }, format: OutputFormat): string {
    if (format === 'text') {
        return `${article.text}\n`
    }
    if (format === 'html') {
        return `${article.html}\n`
    }
    return `${JSON.stringify(article, null, 2)}\n`
}
