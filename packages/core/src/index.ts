import { extractWithHeuristics } from './extractors/heuristic'
import { extractWithReadability } from './extractors/readability'
import type { ArticleResult as InternalArticleResult } from './types'
import { isDocumentOrElement } from './utils/dom'

function emptyArticle (): InternalArticleResult {
    return { html: '', text: '' }
}

function getArticle (dom: Node | null | undefined): InternalArticleResult {
    if (!isDocumentOrElement(dom)) {
        return emptyArticle()
    }

    return extractWithReadability(dom) || extractWithHeuristics(dom) || emptyArticle()
}

export = getArticle
