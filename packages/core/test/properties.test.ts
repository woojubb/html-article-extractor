import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import getArticle from '../src'

function documentFrom (html: string): Document {
    return new JSDOM(html, { url: 'https://example.com/news/article' }).window.document
}

const MIXED_PAGE = `
    <header><p>Site header promo words with enough length to be noticed here.</p></header>
    <main>
        <aside class="sidebar"><a href="/a">link one</a><a href="/b">link two</a></aside>
        <article>
            <p style="display:none">Hidden promo that must never appear in output text.</p>
            <p>The council approved the updated plan after a public review process.</p>
            <p>Construction will begin in September and continue through next year.</p>
        </article>
        <section class="reader-comments"><p>Comment text that must stay out of the article.</p></section>
    </main>
    <script>window.evil = true</script>
`

describe('extraction properties', function () {
    it('never mutates the caller-owned DOM', function () {
        for (const selector of ['body', 'main', 'article'] as const) {
            const document = documentFrom(`<body>${MIXED_PAGE}</body>`)
            const target = selector === 'body' ? document.body : document.querySelector(selector)
            const before = document.body.innerHTML
            getArticle(selector === 'body' ? document : document)
            getArticle(target)
            assert.equal(document.body.innerHTML, before, `DOM changed for ${selector}`)
        }
    })

    it('is deterministic for the same input', function () {
        const document = documentFrom(`<body>${MIXED_PAGE}</body>`)
        assert.deepEqual(getArticle(document.body), getArticle(document.body))
    })

    it('keeps executable and hidden content out of every output', function () {
        const document = documentFrom(`<body>${MIXED_PAGE}</body>`)
        for (const input of [document, document.body] as const) {
            const result = getArticle(input)
            assert.doesNotMatch(result.html, /<script|evil|Hidden promo/i)
            assert.doesNotMatch(result.text, /Hidden promo|Comment text|header promo/i)
        }
    })

    it('honors the public contract for unusable input', function () {
        const document = documentFrom('<body><p>Real content here.</p></body>')
        const textNode = document.createTextNode('lone text node')
        document.body.appendChild(textNode)
        for (const input of [null, undefined, {}, textNode] as const) {
            const result = getArticle(input as unknown as Node)
            assert.deepEqual(result, { html: '', text: '' })
            assert.equal(typeof result.html, 'string')
            assert.equal(typeof result.text, 'string')
        }
    })

    it('stays within performance bounds on large documents', function () {
        const flat = Array.from(
            { length: 2000 },
            function (_, index) {
                return `<p>Paragraph number ${index} with filler words to simulate a large article body.</p>`
            }
        ).join('')
        let started = Date.now()
        const flatResult = getArticle(documentFrom(`<body><article>${flat}</article></body>`))
        assert.ok(Date.now() - started < 2000, 'flat 2000-paragraph page took too long')
        assert.ok(flatResult.text.length > 10000)

        let deep = ''
        for (let index = 0; index < 400; index += 1) {
            deep += `<div class="level-${index}"><p>Nested paragraph ${index} with filler words.</p>`
        }
        started = Date.now()
        getArticle(documentFrom(`<body>${deep}</body>`))
        assert.ok(Date.now() - started < 2000, 'deeply nested page took too long')
    })
})
