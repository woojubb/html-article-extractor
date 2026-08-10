import type { ArticleResult } from '../types'

const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV', 'DL', 'DT',
    'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE',
    'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
])

const NOISE_SELECTOR = [
    'script', 'style', 'template', 'noscript', 'iframe', 'canvas',
    'nav', 'aside', 'footer', 'form', 'button', 'input', 'select', 'textarea',
    '[role="navigation"]', '[hidden]', '[aria-hidden="true"]',
    '[class~="comments"]', '[class~="comment"]', '[class~="related"]',
    '[class~="sidebar"]'
].join(', ')

export function isDomNode (value: unknown): value is Node {
    const candidate = value as Partial<Node> | null | undefined
    return Boolean(candidate && typeof candidate === 'object' &&
        typeof candidate.nodeType === 'number' && typeof candidate.cloneNode === 'function')
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
}

export function createResultFromHtml (document: Document, html: string): ArticleResult | null {
    const container = document.createElement('div')
    container.innerHTML = html
    return createResultFromElement(container)
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
