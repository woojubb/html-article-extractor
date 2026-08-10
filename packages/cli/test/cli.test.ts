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

function articleResponse (): Response {
    return new Response(`
        <article>
            <p>The council approved the updated plan after a public review process.</p>
            <p>Construction will begin in September and continue through next year.</p>
        </article>
    `, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
    })
}

describe('CLI', function () {
    it('prints JSON by default', async function () {
        const capture = captureOutput()
        const exitCode = await run(['https://example.com/news'], {
            fetch: async function () {
                return articleResponse()
            },
            stdout: capture.output
        })

        const result = JSON.parse(capture.read()) as { html: string, text: string }
        assert.equal(exitCode, 0)
        assert.match(result.text, /council approved/)
        assert.match(result.html, /<p>/)
    })

    it('supports plain-text output', async function () {
        const capture = captureOutput()
        await run(['--text', 'https://example.com/news'], {
            fetch: async function () {
                return articleResponse()
            },
            stdout: capture.output
        })

        assert.match(capture.read(), /^The council approved/)
        assert.doesNotMatch(capture.read(), /<p>/)
    })

    it('prints help without making a request', async function () {
        const capture = captureOutput()
        let requested = false
        const exitCode = await run(['--help'], {
            fetch: async function () {
                requested = true
                return articleResponse()
            },
            stdout: capture.output
        })

        assert.equal(exitCode, 0)
        assert.equal(requested, false)
        assert.match(capture.read(), /Usage:/)
    })

    it('rejects unsupported URL protocols', async function () {
        const capture = captureOutput()
        await assert.rejects(
            run(['file:///tmp/article.html'], {
                fetch: async function () {
                    return articleResponse()
                },
                stdout: capture.output
            }),
            /Only HTTP and HTTPS URLs/
        )
    })

    it('reports non-success HTTP responses', async function () {
        const capture = captureOutput()
        await assert.rejects(
            run(['https://example.com/missing'], {
                fetch: async function () {
                    return new Response('Not found', { status: 404 })
                },
                stdout: capture.output
            }),
            /HTTP 404/
        )
    })
})
