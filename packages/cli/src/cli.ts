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
            'user-agent': 'html-article-extractor/1.0 (+https://github.com/jungyoun/html-article-extractor)'
        },
        redirect: 'follow'
    })
    if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}`)
    }

    const html = decodeResponse(await response.arrayBuffer(), response.headers.get('content-type'))
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
    const charset = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1] || 'utf-8'
    try {
        return new TextDecoder(charset).decode(buffer)
    } catch {
        return new TextDecoder('utf-8').decode(buffer)
    }
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
