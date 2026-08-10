import type { ArticleResult } from '../types'
import {
    cloneContentRoot,
    createResultFromElement,
    getNormalizedText,
    hasMeaningfulText,
    removeNoise
} from '../utils/dom'

const CANDIDATE_SELECTOR = 'article, main, section, div'
const POSITIVE_HINT = /article|body|content|entry|main|page|post|story|text/i
const NEGATIVE_HINT = /ad-|banner|comment|cookie|footer|header|menu|nav|promo|related|share|sidebar|social/i

export function extractWithHeuristics (node: Node): ArticleResult | null {
    const root = cloneContentRoot(node)
    if (!root) {
        return null
    }

    removeNoise(root)
    const candidates = Array.from(root.querySelectorAll(CANDIDATE_SELECTOR))
    if (root.matches(CANDIDATE_SELECTOR)) {
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
    const punctuationCount = (text.match(/[,.!?;:。！？，]/g) || []).length
    const linkDensity = Math.min(linkLength / Math.max(text.length, 1), 1)
    const hints = `${node.id} ${node.getAttribute('class') || ''}`

    let score = text.length * (1 - linkDensity)
    score += paragraphCount * 25
    score += punctuationCount * 10
    score += semanticBonus(node.tagName)
    score += POSITIVE_HINT.test(hints) ? 40 : 0
    score -= NEGATIVE_HINT.test(hints) ? 120 : 0

    return { node, score }
}

function semanticBonus (tagName: string): number {
    if (tagName === 'ARTICLE') {
        return 100
    }
    if (tagName === 'MAIN') {
        return 60
    }
    return 0
}
