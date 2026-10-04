import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { run } from '../src/cli'

function captureOutput (): { output: { write: (chunk: string) => boolean }, read: () => string } {
    let value = ''
    return {
        output: {
            write: function (chunk: string): boolean {
                value += chunk
                return true
            }
        },
        read: function (): string {
            return value
        }
    }
}

function articleHtml (): string {
    return `
        <article>
            <p>The council approved the updated plan after a public review process.</p>
            <p>Construction will begin in September and continue through next year.</p>
        </article>
    `
}

function responseWith (body: BodyInit, contentType: string | null): Response {
    const headers = new Headers()
    if (contentType) {
        headers.set('content-type', contentType)
    }
    return new Response(body, { status: 200, headers })
}

describe('CLI robustness', function () {
    it('sniffs meta charset when the header has none', async function () {
        const eucKrBytes = Buffer.from([0xB0, 0xA1, 0xB3, 0xAA])
        const eucKrText = new TextDecoder('euc-kr').decode(eucKrBytes)
        const page = Buffer.concat([
            Buffer.from('<html><head><meta charset="EUC-KR"></head><body><article><p>', 'latin1'),
            Buffer.from(eucKrBytes),
            Buffer.from(' council approved the plan after a long public review process.</p><p>Construction will begin in September and continue through next year.</p></article></body></html>', 'latin1')
        ])

        const capture = captureOutput()
        const exitCode = await run(['--text', 'https://example.com/euckr'], {
            fetch: async function () {
                return responseWith(page, 'text/html')
            },
            stdout: capture.output
        })

        assert.equal(exitCode, 0)
        assert.match(capture.read(), new RegExp(eucKrText))
    })

    it('rejects responses larger than 5 MB', async function () {
        const capture = captureOutput()
        await assert.rejects(
            run(['https://example.com/huge'], {
                fetch: async function () {
                    return responseWith('x'.repeat(5_000_001), 'text/html; charset=utf-8')
                },
                stdout: capture.output
            }),
            /exceeds the 5 MB limit/
        )
    })

    it('passes a timeout signal to fetch and surfaces aborts', async function () {
        const capture = captureOutput()
        let observed: unknown
        await assert.rejects(
            run(['https://example.com/slow'], {
                fetch: async function (_url: unknown, init?: { signal?: AbortSignal }) {
                    observed = init?.signal
                    const error = new DOMException('The operation was aborted.', 'TimeoutError')
                    return await Promise.reject(error)
                },
                stdout: capture.output
            }),
            /abort/i
        )
        assert.ok(observed instanceof AbortSignal)
    })

    it('falls back to utf-8 for unknown charsets', async function () {
        const capture = captureOutput()
        const exitCode = await run(['--text', 'https://example.com/news'], {
            fetch: async function () {
                return responseWith(articleHtml(), 'text/html; charset=unknown-xyz-123')
            },
            stdout: capture.output
        })

        assert.equal(exitCode, 0)
        assert.match(capture.read(), /council approved/)
    })
})
