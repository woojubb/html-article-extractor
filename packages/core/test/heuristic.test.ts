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
})
