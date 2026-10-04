import type { ArticleResult } from '../types'

const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV', 'DL', 'DT',
    'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE',
    'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
])

const BOILERPLATE_HINTS = [
    'comment', 'sidebar', 'related', 'share', 'promo', 'banner', 'cookie',
    'newsletter', 'subscribe', 'advert', 'sponsor', 'ranking', 'trending',
    'popular', 'most-read', 'most-viewed'
]

function hintSelectors (): string[] {
    const selectors: string[] = []
    for (const hint of BOILERPLATE_HINTS) {
        const capitalized = hint.charAt(0).toUpperCase() + hint.slice(1)
        selectors.push(`[class*="${hint}"]`, `[class*="${capitalized}"]`)
    }
    selectors.push('[id*="comment"]', '[id*="Comment"]', '[id*="sidebar"]', '[id*="Sidebar"]')
    selectors.push('[class*="mostRead"]', '[class*="mostViewed"]')
    return selectors
}

const NOISE_SELECTOR = [
    'script', 'style', 'template', 'noscript', 'iframe', 'canvas',
    'nav', 'aside', 'footer', 'form', 'button', 'input', 'select', 'textarea',
    '[role="navigation"]', '[hidden]', '[aria-hidden="true"]',
    '[style*="display:none"]', '[style*="display: none"]',
    '[style*="visibility:hidden"]', '[style*="visibility: hidden"]',
    '[class~="comments"]', '[class~="comment"]', '[class~="related"]',
    '[class~="sidebar"]',
    ...hintSelectors()
].join(', ')

export function isDomNode (value: unknown): value is Node {
    const candidate = value as Partial<Node> | null | undefined
    return Boolean(candidate && typeof candidate === 'object' &&
        typeof candidate.nodeType === 'number' && typeof candidate.cloneNode === 'function')
}

export function isDocumentOrElement (value: unknown): value is Document | Element {
    if (!isDomNode(value)) {
        return false
    }
    return value.nodeType === 9 || value.nodeType === 1
}

export function createExtractionDocument (node: Node): Document | null {
    if (node.nodeType === 9) {
        return node.cloneNode(true) as Document
    }

    const sourceDocument = node.ownerDocument
    if (!sourceDocument?.implementation) {
        return null
    }

    if (node === sourceDocument.body || node === sourceDocument.documentElement) {
        return sourceDocument.cloneNode(true) as Document
    }

    const document = sourceDocument.implementation.createHTMLDocument(sourceDocument.title)
    if (sourceDocument.baseURI && sourceDocument.baseURI !== 'about:blank') {
        const base = document.createElement('base')
        base.href = sourceDocument.baseURI
        document.head.appendChild(base)
    }
    document.body.appendChild(document.importNode(node, true))
    return document
}

export function cloneContentRoot (node: Node): Element | null {
    if (node.nodeType === 9) {
        const document = node as Document
        return document.body?.cloneNode(true) as Element | null
    }
    if (node.nodeType !== 1) {
        return null
    }
    return node.cloneNode(true) as Element
}

export function removeNoise (root: Element): void {
    for (const element of root.querySelectorAll(NOISE_SELECTOR)) {
        element.remove()
    }
    for (const element of root.querySelectorAll('header, footer')) {
        if (!element.closest('article, main')) {
            element.remove()
        }
    }
}

export function resolveRelativeUrls (root: Element, baseUri: string | null | undefined): void {
    if (!baseUri || baseUri === 'about:blank') {
        return
    }
    let base: URL
    try {
        base = new URL(baseUri)
    } catch {
        return
    }
    for (const anchor of root.querySelectorAll('a[href]')) {
        const href = anchor.getAttribute('href')
        if (href) {
            anchor.setAttribute('href', resolveUrl(href, base))
        }
    }
    for (const media of root.querySelectorAll('img[src], video[src], audio[src], source[src], video[poster]')) {
        for (const attribute of ['src', 'poster']) {
            const value = media.getAttribute(attribute)
            if (value) {
                media.setAttribute(attribute, resolveUrl(value, base))
            }
        }
    }
}

function resolveUrl (value: string, base: URL): string {
    const trimmed = value.trim()
    if (!trimmed || trimmed.startsWith('#') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
        return value
    }
    try {
        return new URL(trimmed, base).toString()
    } catch {
        return value
    }
}

export function promoteLazyImages (root: Element): void {
    for (const image of root.querySelectorAll('img')) {
        const src = image.getAttribute('src')
        if (src && !isPlaceholderSrc(src)) {
            continue
        }
        const lazy = image.getAttribute('data-src') || image.getAttribute('data-original') ||
            image.getAttribute('data-lazy-src')
        if (lazy) {
            image.setAttribute('src', lazy)
        }
    }
}

function isPlaceholderSrc (src: string): boolean {
    const value = src.trim().toLowerCase()
    return !value || value.startsWith('data:') || value === 'about:blank'
}

export function getBaseUri (node: Node): string | null {
    const document = node.nodeType === 9 ? node as Document : node.ownerDocument
    const uri = document?.baseURI
    return uri && uri !== 'about:blank' ? uri : null
}

const COMMENT_SELECTOR = [
    '[class*="comment"]', '[class*="Comment"]',
    '[id*="comment"]', '[id*="Comment"]'
].join(', ')

const BOILERPLATE_SECTION_SELECTOR = [
    '[class~="comments"]', '[class~="comment"]', '[class~="related"]',
    '[class~="sidebar"]',
    ...hintSelectors()
].join(', ')

export function stripCommentSections (root: Element): void {
    for (const element of root.querySelectorAll(COMMENT_SELECTOR)) {
        element.remove()
    }
}

export function stripBoilerplateSections (root: Element): void {
    for (const element of root.querySelectorAll(BOILERPLATE_SECTION_SELECTOR)) {
        element.remove()
    }
}

export function getLinkDensity (element: Element): number {
    const text = getNormalizedText(element)
    if (!text) {
        return 0
    }
    let linkLength = 0
    for (const link of element.querySelectorAll('a')) {
        linkLength += getNormalizedText(link).length
    }
    return Math.min(linkLength / text.length, 1)
}

export function removeLinkDenseContainers (root: Element): void {
    for (const element of root.querySelectorAll('div, section, aside, nav, ul, ol')) {
        const text = getNormalizedText(element)
        if (!text || element.querySelectorAll('p').length > 0) {
            continue
        }
        const density = getLinkDensity(element)
        const threshold = element.tagName === 'UL' || element.tagName === 'OL' ? 0.75 : 0.6
        if (density > threshold) {
            element.remove()
        }
    }
}

export function createResultFromElement (element: Element): ArticleResult | null {
    const html = element.innerHTML.trim()
    const text = getNormalizedText(element)
    if (!html || !hasMeaningfulText(text)) {
        return null
    }
    return { html, text }
}

export function getNormalizedText (node: Node): string {
    const parts: string[] = []
    collectText(node, parts)
    return parts.join('').replace(/\s+/g, ' ').trim()
}

function collectText (node: Node, parts: string[]): void {
    if (node.nodeType === 3) {
        parts.push(node.textContent || '')
        return
    }
    if (![1, 9, 11].includes(node.nodeType)) {
        return
    }

    const element = node.nodeType === 1 ? node as Element : null
    const isBlock = Boolean(element && BLOCK_TAGS.has(element.tagName))
    if (isBlock) {
        parts.push(' ')
    }
    for (const child of node.childNodes) {
        collectText(child, parts)
    }
    if (isBlock) {
        parts.push(' ')
    }
}

export function hasMeaningfulText (text: string): boolean {
    const normalized = text.trim()
    if (!normalized) {
        return false
    }
    if (normalized.split(/\s+/).length > 1) {
        return true
    }
    return normalized.length >= 20 && /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(normalized)
}
