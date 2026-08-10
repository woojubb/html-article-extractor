import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import getArticle from '../src'

function documentFrom (html: string, url?: string): Document {
    return new JSDOM(html, {
        url: url || 'https://example.com/news/article'
    }).window.document
}

describe('getArticle', function () {
    it('always returns the public empty result for unusable input', function () {
        assert.deepEqual(getArticle(null), { html: '', text: '' })
        assert.deepEqual(getArticle({} as Node), { html: '', text: '' })
        assert.deepEqual(getArticle(documentFrom('<body></body>').body), {
            html: '',
            text: ''
        })
    })

    it('extracts the article while excluding page chrome and related links', function () {
        const fixture = readFileSync(join(__dirname, 'fixtures', 'news-article.html'), 'utf8')
        const result = getArticle(documentFrom(fixture).body)

        assert.match(result.text, /city council approved the transit plan/i)
        assert.match(result.text, /service will begin next spring/i)
        assert.doesNotMatch(result.text, /subscribe to our newsletter/i)
        assert.doesNotMatch(result.text, /most read stories/i)
        assert.doesNotMatch(result.text, /reader comments/i)
        assert.doesNotMatch(result.html, /readability-page-/i)
    })

    it('prefers prose over a long, link-heavy sidebar', function () {
        const links = Array.from({ length: 30 }, function (_, index) {
            return `<a href="/topic/${index}">Trending topic number ${index}</a>`
        }).join('')
        const document = documentFrom(`
            <main>
                <aside class="sidebar related-links">${links}</aside>
                <article class="story-content">
                    <p>The research team published a detailed report after two years of field work.</p>
                    <p>The findings explain how local communities adapted to repeated coastal flooding.</p>
                    <p>Researchers said the next phase will compare results across several regions.</p>
                </article>
            </main>
        `)

        const result = getArticle(document.body)
        assert.match(result.text, /research team published/i)
        assert.doesNotMatch(result.text, /Trending topic number/i)
    })

    it('normalizes whitespace and inserts boundaries between block elements', function () {
        const document = documentFrom(`
            <article>
                <p>First paragraph has     irregular spacing.</p>
                <p>Second paragraph starts on a new line.</p>
            </article>
        `)

        const result = getArticle(document.body)
        assert.equal(
            result.text,
            'First paragraph has irregular spacing. Second paragraph starts on a new line.'
        )
    })

    it('supports Korean articles without relying on Latin punctuation', function () {
        const document = documentFrom(`
            <article class="article-body">
                <p>시의회는 오늘 대중교통 개선 계획을 최종 승인했습니다.</p>
                <p>새 노선은 내년 봄부터 운행되며 교통 취약 지역을 우선 연결합니다.</p>
                <p>시는 이용 현황을 분석해 배차 간격을 지속적으로 조정할 예정입니다.</p>
            </article>
        `)

        const result = getArticle(document.body)
        assert.match(result.text, /대중교통 개선 계획/)
        assert.match(result.text, /배차 간격/)
    })

    it('does not mutate the caller-owned DOM', function () {
        const document = documentFrom(`
            <main>
                <article><p>This article contains enough words for extraction and mutation testing.</p></article>
                <script>window.changed = true</script>
            </main>
        `)
        const before = document.body.innerHTML

        getArticle(document.body)

        assert.equal(document.body.innerHTML, before)
    })

    it('accepts a Document or a subtree and keeps subtree extraction scoped', function () {
        const document = documentFrom(`
            <article id="outside">
                <p>Outside content is deliberately longer and should not appear in a scoped result.</p>
                <p>It includes another paragraph to make the competing article more substantial.</p>
            </article>
            <section id="target">
                <p>Scoped content remains available when an element is passed directly.</p>
                <p>The extractor must not inspect siblings outside this selected subtree.</p>
            </section>
        `)

        const wholePage = getArticle(document)
        const subtree = getArticle(document.querySelector('#target'))

        assert.match(wholePage.text, /Outside content/)
        assert.match(subtree.text, /Scoped content/)
        assert.doesNotMatch(subtree.text, /Outside content/)
    })

    it('resolves relative article links against the source document URL', function () {
        const document = documentFrom(`
            <article>
                <p>The full investigation is available in the supporting report linked below.</p>
                <p><a href="../reports/findings.html">Read the complete findings and methodology.</a></p>
            </article>
        `, 'https://example.com/news/2026/story.html')

        const result = getArticle(document.body)
        assert.match(result.html, /https:\/\/example\.com\/news\/reports\/findings\.html/)
    })

    it('rejects a single-word page', function () {
        const result = getArticle(documentFrom('<div>hello</div>').body)
        assert.deepEqual(result, { html: '', text: '' })
    })
})
