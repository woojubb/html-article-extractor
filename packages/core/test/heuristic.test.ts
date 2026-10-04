import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { extractWithHeuristics } from '../src/extractors/heuristic'

describe('heuristic fallback', function () {
    it('scores semantic prose above navigation-like content', function () {
        const document = new JSDOM(`
            <main>
                <aside class="sidebar related">
                    <a href="/a">Alpha topic link</a>
                    <a href="/b">Beta topic link</a>
                    <a href="/c">Gamma topic link</a>
                </aside>
                <article class="article-content">
                    <p>Editors verified the records before publishing the investigation.</p>
                    <p>The report includes interviews, public documents, and field observations.</p>
                </article>
                <section class="comments">
                    <p>A reader comment that must remain outside the extracted article.</p>
                </section>
            </main>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /Editors verified the records/)
        assert.doesNotMatch(result.text, /Alpha topic link/)
        assert.doesNotMatch(result.text, /reader comment/)
    })

    it('removes executable and hidden content from fallback output', function () {
        const document = new JSDOM(`
            <article>
                <script>dangerousFunction()</script>
                <p hidden>Hidden promotional message with several words.</p>
                <p>The visible report contains enough useful words to be selected correctly.</p>
            </article>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /visible report/)
        assert.doesNotMatch(result.html, /script|dangerousFunction|promotional message/i)
    })

    it('removes inline hidden styles from fallback output', function () {
        const document = new JSDOM(`
            <article>
                <p style="display:none">Hidden promo with many words that should not appear here.</p>
                <p style="visibility: hidden">Invisible offer with enough words to confuse a scorer.</p>
                <p>The visible report contains enough useful words to be selected correctly.</p>
                <p>Another visible paragraph provides substantial content for selection.</p>
            </article>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /visible report/)
        assert.doesNotMatch(result.text, /Hidden promo|Invisible offer/i)
    })

    it('extracts flat paragraphs without a wrapper element', function () {
        const document = new JSDOM(`
            <body>
                <p>First bare paragraph with enough words to be meaningful content here.</p>
                <p>Second bare paragraph with more meaningful content for extraction testing.</p>
            </body>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /First bare paragraph/)
        assert.match(result.text, /Second bare paragraph/)
    })

    it('resolves relative urls against the source document', function () {
        const document = new JSDOM(`
            <article>
                <p>The full investigation is available in the supporting report linked below.</p>
                <p><a href="../reports/findings.html">Read the complete findings and methodology.</a></p>
            </article>
        `, { url: 'https://example.com/news/2026/story.html' }).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.html, /https:\/\/example\.com\/news\/reports\/findings\.html/)
    })

    it('drops page-chrome headers outside article and main', function () {
        const document = new JSDOM(`
            <div class="content">
                <header><p>Site header promo words with enough length to confuse scoring.</p></header>
                <p>Real article first paragraph with substantial content about the findings.</p>
                <p>Real article second paragraph with more details and quotes from officials.</p>
            </div>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /Real article first paragraph/)
        assert.doesNotMatch(result.text, /Site header promo/i)
    })

    it('drops visually hidden accessibility labels from chrome', function () {
        const document = new JSDOM(`
            <div class="content">
                <div><label><span class="VisuallyHidden-styles__x">Site search</span></label><input type="text"></div>
                <p>Real article first paragraph with substantial content about the findings.</p>
                <p>Real article second paragraph with more details and quotes from officials.</p>
            </div>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /Real article first paragraph/)
        assert.doesNotMatch(result.text, /Site search/i)
    })

    it('keeps headers that belong to the article itself', function () {
        const document = new JSDOM(`
            <article>
                <header><h1>City approves transit plan</h1><p>By Mina Park, staff reporter.</p></header>
                <p>The city council approved the transit plan after months of public meetings.</p>
                <p>The proposal adds three bus routes and extends evening schedules.</p>
            </article>
        `).window.document

        const result = extractWithHeuristics(document.body)
        assert.ok(result)
        assert.match(result.text, /Mina Park/)
    })
})
