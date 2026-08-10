import { Readability } from '@mozilla/readability'
import type { ArticleResult } from '../types'
import {
    createExtractionDocument,
    createResultFromHtml,
    hasMeaningfulText
} from '../utils/dom'

export function extractWithReadability (node: Node): ArticleResult | null {
    const document = createExtractionDocument(node)
    if (!document) {
        return null
    }

    try {
        const article = new Readability(document, {
            charThreshold: 0,
            keepClasses: false
        }).parse()

        if (!article?.content) {
            return null
        }

        const result = createResultFromHtml(document, unwrapContent(document, article.content))
        return result && hasMeaningfulText(result.text) ? result : null
    } catch {
        return null
    }
}

function unwrapContent (document: Document, content: string): string {
    const container = document.createElement('div')
    container.innerHTML = content
    const wrapper = container.firstElementChild

    if (wrapper && /^readability-page-/.test(wrapper.id)) {
        return wrapper.innerHTML
    }
    return container.innerHTML
}
