import { extractWithHeuristics } from './extractors/heuristic'
import { extractWithReadability } from './extractors/readability'
import type { ArticleResult as InternalArticleResult } from './types'
import { isDomNode } from './utils/dom'

function emptyArticle (): InternalArticleResult {
    return { html: '', text: '' }
}

function getArticle (dom: Node | null | undefined): InternalArticleResult {
    if (!isDomNode(dom)) {
        return emptyArticle()
    }

    return extractWithReadability(dom) || extractWithHeuristics(dom) || emptyArticle()
}

export = getArticle
