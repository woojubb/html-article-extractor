import type { ArticleResult } from '../types'
import {
    cloneContentRoot,
    createResultFromElement,
    getBaseUri,
    getNormalizedText,
    hasMeaningfulText,
    promoteLazyImages,
    removeNoise,
    resolveRelativeUrls
} from '../utils/dom'

const CANDIDATE_SELECTOR = 'article, main, section, div, p'
const POSITIVE_HINT = /article|body|content|entry|main|page|post|story|text/i
const NEGATIVE_HINT = /(?:^|[\s_-])ads?(?:$|[\s_-])|banner|comment|cookie|footer|header|menu|nav|promo|related|share|sidebar|social/i
const MAX_ELEMENTS_TO_PARSE = 50000

export function extractWithHeuristics (node: Node): ArticleResult | null {
    const baseUri = getBaseUri(node)
    const root = cloneContentRoot(node)
    if (!root) {
        return null
    }
    if (root.querySelectorAll('*').length > MAX_ELEMENTS_TO_PARSE) {
        return null
    }

    removeNoise(root)
    promoteLazyImages(root)
    resolveRelativeUrls(root, baseUri)
    const candidates = Array.from(root.querySelectorAll(CANDIDATE_SELECTOR))
    if (!candidates.includes(root)) {
        candidates.unshift(root)
    }

    let best: ScoredCandidate | null = null
    for (const candidate of candidates) {
        const scored = scoreCandidate(candidate)
        if (scored && (!best || scored.score > best.score)) {
            best = scored
        }
    }

    return best ? createResultFromElement(best.node) : null
}

interface ScoredCandidate {
    node: Element
    score: number
}

function scoreCandidate (node: Element): ScoredCandidate | null {
    const text = getNormalizedText(node)
    if (!hasMeaningfulText(text)) {
        return null
    }

    const links = Array.from(node.querySelectorAll('a'))
    const linkLength = links.reduce(function (total, link) {
        return total + getNormalizedText(link).length
    }, 0)
    const paragraphCount = node.querySelectorAll('p').length
    const listItemCount = node.querySelectorAll('li').length
    const punctuationCount = (text.match(/[,.!?;:。！？，]/g) || []).length
    const linkDensity = Math.min(linkLength / Math.max(text.length, 1), 1)
    const hints = `${node.id} ${node.getAttribute('class') || ''}`

    let score = text.length * (1 - linkDensity)
    score += paragraphCount * 25
    score += punctuationCount * 10
    score += semanticBonus(node.tagName)
    score += POSITIVE_HINT.test(hints) ? 40 : 0
    score -= NEGATIVE_HINT.test(hints) ? 120 : 0
    if (node.tagName === 'P') {
        score += 20
    }

    if (linkDensity > 0.5) {
        score *= 0.25
    } else if (linkDensity > 0.35) {
        score *= 0.6
    }
    if (listItemCount * 20 > text.length) {
        score *= 0.4
    }

    return { node, score }
}

function semanticBonus (tagName: string): number {
    if (tagName === 'ARTICLE') {
        return 100
    }
    if (tagName === 'MAIN') {
        return 60
    }
    if (tagName === 'HEADER' || tagName === 'FOOTER' || tagName === 'NAV' ||
        tagName === 'ASIDE' || tagName === 'FORM') {
        return -80
    }
    return 0
}
