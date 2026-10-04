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

function tokenize (text: string): string[] {
    return text.toLowerCase().split(/\s+/).filter(Boolean)
}

function wordScores (expected: string, actual: string): { precision: number, recall: number, f1: number } {
    const remaining = new Map<string, number>()
    for (const token of tokenize(actual)) {
        remaining.set(token, (remaining.get(token) || 0) + 1)
    }
    let hits = 0
    const expectedTokens = tokenize(expected)
    for (const token of expectedTokens) {
        const count = remaining.get(token) || 0
        if (count > 0) {
            hits += 1
            remaining.set(token, count - 1)
        }
    }
    const precision = tokenize(actual).length === 0 ? 0 : hits / tokenize(actual).length
    const recall = expectedTokens.length === 0 ? 0 : hits / expectedTokens.length
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
    return { precision, recall, f1 }
}

interface CorpusCase {
    name: string
    html: string
    expected: string[]
    forbidden: string[]
    url?: string
    expectHtml?: RegExp[]
    rejectHtml?: RegExp[]
}

const SIDEBAR_LINKS = Array.from({ length: 30 }, function (_, index) {
    return `<a href="/topic/${index}">Trending topic number ${index}</a>`
}).join('')

const CORPUS: CorpusCase[] = [
    {
        name: 'news article with chrome and comments',
        html: readFileSync(join(__dirname, 'fixtures', 'news-article.html'), 'utf8'),
        expected: [
            'By Mina Park',
            'The city council approved the transit plan on Tuesday after months of public meetings and technical review.',
            'The proposal adds three bus routes, extends evening schedules, and creates direct connections to two regional rail stations.',
            'Officials said service will begin next spring. Ridership and on-time performance will be reviewed every quarter.',
            'A bus arrives at the central station during the morning commute.'
        ],
        forbidden: ['Subscribe to our newsletter', 'Most read stories', 'Reader comments', 'Copyright']
    },
    {
        name: 'div sidebar with high link density',
        html: `
            <main>
                <div class="links">${SIDEBAR_LINKS}</div>
                <div class="story">
                    <p>The research team published a detailed report after two years of field work.</p>
                    <p>The findings explain how local communities adapted to repeated coastal flooding.</p>
                    <p>Researchers said the next phase will compare results across several regions.</p>
                </div>
            </main>
        `,
        expected: [
            'The research team published a detailed report after two years of field work.',
            'The findings explain how local communities adapted to repeated coastal flooding.',
            'Researchers said the next phase will compare results across several regions.'
        ],
        forbidden: ['Trending topic number']
    },
    {
        name: 'korean article without latin punctuation',
        html: `
            <article class="article-body">
                <p>시의회는 오늘 대중교통 개선 계획을 최종 승인했습니다.</p>
                <p>새 노선은 내년 봄부터 운행되며 교통 취약 지역을 우선 연결합니다.</p>
                <p>시는 이용 현황을 분석해 배차 간격을 지속적으로 조정할 예정입니다.</p>
            </article>
        `,
        expected: [
            '시의회는 오늘 대중교통 개선 계획을 최종 승인했습니다.',
            '새 노선은 내년 봄부터 운행되며 교통 취약 지역을 우선 연결합니다.',
            '시는 이용 현황을 분석해 배차 간격을 지속적으로 조정할 예정입니다.'
        ],
        forbidden: []
    },
    {
        name: 'technical article with table, code and captions',
        html: `
            <body>
                <nav>Home Docs API</nav>
                <article>
                    <h1>Benchmark results for the new parser</h1>
                    <p>The team measured throughput across three payload sizes last week.</p>
                    <table><tr><th>Payload</th><th>Throughput</th></tr><tr><td>Small</td><td>1200 rps</td></tr></table>
                    <pre><code>const result = parse(payload)</code></pre>
                    <figure><img src="/chart.png" alt="chart"><figcaption>Throughput grows linearly with payload size.</figcaption></figure>
                    <p>Analysis shows the new parser doubles the previous throughput.</p>
                </article>
            </body>
        `,
        expected: [
            'The team measured throughput across three payload sizes last week.',
            'Payload Throughput Small 1200 rps',
            'const result = parse(payload)',
            'Throughput grows linearly with payload size.',
            'Analysis shows the new parser doubles the previous throughput.'
        ],
        forbidden: ['Home Docs API'],
        expectHtml: [/<table/, /<code/, /<figcaption/]
    },
    {
        name: 'fragmented article with comment variants',
        html: `
            <main>
                <aside>${SIDEBAR_LINKS}</aside>
                <div class="post"><p>Fragment one reports the council vote with substantial prose about city planning.</p></div>
                <div class="post"><p>Fragment two continues with budget details and the construction schedule for spring.</p></div>
                <section class="news-comments">
                    <p>A reader comment that must remain outside the extracted article text here.</p>
                    <p>Another comment paragraph with more words to inflate its score significantly.</p>
                </section>
            </main>
        `,
        expected: [
            'Fragment one reports the council vote with substantial prose about city planning.',
            'Fragment two continues with budget details and the construction schedule for spring.'
        ],
        forbidden: ['reader comment', 'Another comment paragraph', 'Trending topic number']
    },
    {
        name: 'flat paragraphs directly under body',
        html: `
            <body>
                <p>First bare paragraph with enough words to be meaningful content for extraction.</p>
                <p>Second bare paragraph with more meaningful content for extraction testing today.</p>
                <p>Third paragraph continues the bare body article content for testing purposes.</p>
            </body>
        `,
        expected: [
            'First bare paragraph with enough words to be meaningful content for extraction.',
            'Second bare paragraph with more meaningful content for extraction testing today.',
            'Third paragraph continues the bare body article content for testing purposes.'
        ],
        forbidden: []
    },
    {
        name: 'hidden style promo inside article',
        html: `
            <article>
                <p style="display:none">Hidden promo with many words that should never appear in output at all.</p>
                <p style="visibility: hidden">Invisible offer text with enough words to confuse a naive scorer here.</p>
                <p>The visible report contains enough useful words to be selected correctly today.</p>
                <p>Another visible paragraph provides substantial content for the article body text.</p>
            </article>
        `,
        expected: [
            'The visible report contains enough useful words to be selected correctly today.',
            'Another visible paragraph provides substantial content for the article body text.'
        ],
        forbidden: ['Hidden promo', 'Invisible offer']
    },
    {
        name: 'relative article links are resolved',
        html: `
            <article>
                <p>The full investigation is available in the supporting report linked below.</p>
                <p><a href="../reports/findings.html">Read the complete findings and methodology.</a></p>
            </article>
        `,
        url: 'https://example.com/news/2026/story.html',
        expected: [
            'The full investigation is available in the supporting report linked below.',
            'Read the complete findings and methodology.'
        ],
        forbidden: [],
        expectHtml: [/https:\/\/example\.com\/news\/reports\/findings\.html/]
    },
    {
        name: 'lazy images are promoted to src',
        html: `
            <article>
                <p>Photo essay from the central station during the morning commute today.</p>
                <img data-src="https://example.com/images/transit.jpg" src="" alt="bus">
                <p>Ridership numbers recovered to pre-pandemic levels according to officials.</p>
                <p>The agency plans to publish a full timetable before the end of the year.</p>
            </article>
        `,
        expected: [
            'Photo essay from the central station during the morning commute today.',
            'Ridership numbers recovered to pre-pandemic levels according to officials.',
            'The agency plans to publish a full timetable before the end of the year.'
        ],
        forbidden: [],
        expectHtml: [/https:\/\/example\.com\/images\/transit\.jpg/]
    },
    {
        name: 'korean portal page with ranking, related and comments',
        html: `
            <!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Test</title></head><body>
            <header><nav>뉴스 스포츠 연예</nav></header>
            <div id="content">
                <div class="ranking"><ul>
                    <li><a href="/rank/1">실시간 랭킹 뉴스 일번</a></li>
                    <li><a href="/rank/2">실시간 랭킹 뉴스 이번</a></li>
                </ul></div>
                <article>
                    <header><h1>시의회 대중교통 개편안 통과</h1><p>기자 홍길동 입력 2026.10.04</p></header>
                    <p>시의회는 오늘 본회의에서 대중교통 개편안을 최종 가결했습니다.</p>
                    <p><img data-src="https://example.com/photo/bus.jpg" src="" alt="버스">새 노선은 내년 봄부터 운행을 시작합니다.</p>
                    <div class="article_video"><iframe src="https://example.com/embed/1"></iframe></div>
                    <p>시는 이용 현황을 분석해 배차 간격을 조정하겠다고 밝혔습니다.</p>
                    <p>관련 보고서는 <a href="/reports/2026/transit.pdf">여기에서 확인할 수 있습니다</a>.</p>
                </article>
                <div class="related_news"><a href="/r1">지하철 요금 인상안 보류</a></div>
                <div id="comment_area"><p>네티즌 댓글은 여기에 표시됩니다 축하합니다 여러분.</p><p>두 번째 댓글 문단으로 점수를 부풀립니다 계속 씁니다.</p></div>
            </div>
            <footer>Copyright 예시뉴스</footer>
            </body></html>
        `,
        url: 'https://news.example.com/article/123',
        expected: [
            '시의회 대중교통 개편안 통과',
            '기자 홍길동 입력 2026.10.04',
            '시의회는 오늘 본회의에서 대중교통 개편안을 최종 가결했습니다.',
            '새 노선은 내년 봄부터 운행을 시작합니다.',
            '시는 이용 현황을 분석해 배차 간격을 조정하겠다고 밝혔습니다.',
            '관련 보고서는 여기에서 확인할 수 있습니다.'
        ],
        forbidden: ['랭킹 뉴스', '요금 인상안', '네티즌 댓글', '스포츠 연예'],
        expectHtml: [/example\.com\/photo\/bus\.jpg/, /example\.com\/reports\/2026\/transit\.pdf/],
        rejectHtml: [/<iframe/]
    }
]

describe('extraction corpus', function () {
    for (const entry of CORPUS) {
        it(`keeps content and drops boilerplate: ${entry.name}`, function () {
            const document = documentFrom(entry.html, entry.url)
            const result = getArticle(document.body)
            const expectedText = entry.expected.join(' ')
            const scores = wordScores(expectedText, result.text)

            assert.ok(result.text, 'expected non-empty article text')
            assert.ok(scores.recall >= 0.9, `recall ${scores.recall.toFixed(3)} below 0.90`)
            assert.ok(scores.precision >= 0.8, `precision ${scores.precision.toFixed(3)} below 0.80`)
            for (const phrase of entry.forbidden) {
                assert.doesNotMatch(result.text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
            }
            for (const pattern of entry.expectHtml || []) {
                assert.match(result.html, pattern)
            }
            for (const pattern of entry.rejectHtml || []) {
                assert.doesNotMatch(result.html, pattern)
            }
        })
    }

    it('returns the empty contract for pages without article content', function () {
        const emptyPages = [
            '<body></body>',
            '<body><div>hello</div></body>',
            '<body><script>window.x = 1</script><style>.a { color: red }</style></body>',
            '<body><nav><a href="/a">one</a><a href="/b">two</a></nav></body>'
        ]
        for (const html of emptyPages) {
            assert.deepEqual(getArticle(documentFrom(html).body), { html: '', text: '' })
        }
    })
})
