let DEBUG_MODE = true
let best = null
const Info = require('./struct/info')

function getArticle (dom) {
    initBestArticle()
    analyzeNode(dom)
    if (!best || !best.node) {
        return {
            html: '',
            text: ''
        }
    }
    return {
        html: best.node.innerHTML,
        text: best.text
    }
}

function initBestArticle () {
    best = {
        node: null,
        count: -1,
        score: -1,
        detail: {
            count: -1
        }
    }
}

function analyzeNode(node){
    const { childNodes } = node
	for (let i=0; i < childNodes.length; i++){
        const { tagName, nodeType, innerHTML } = childNodes[i]
		if (nodeType == 1){
			if (['DIV', 'ARTICLE'].includes(tagName)){
                const info = getInfo(childNodes[i]);
                if (info) {
                    /*
                    console.log({
                        analyzeNode: {
                            html: cleanText(innerHTML || '').substring(0, 400),
                            info: info,
                            score: best.score + '=' + info.score,
                            count: best.detail.count + '=' + info.detail.count
                        }
                    })
                    */
                    
                    if (best.score <= info.score){
                        best = {
                            node: childNodes[i],
                            text: info.text,
                            score: info.score,
                            detail: info.detail
                        }
                        /*
                        console.log({
                            best: best
                        })
                        */
                    } 
                }
			}
        }
		analyzeNode(childNodes[i]);
    }
}

function cleanText(text) {
    text = text.replace(/&nbsp;/gi, ' ')
    text = text.replace(/\r+/g, '')
    text = text.replace(/\n+/g, '')
    text = text.replace(/\t+/g, '')
    text = text.replace(/\s+/g, ' ')
    return text.trim()
}

function cleanChildrenNode(parent, maxdepth){
    if (maxdepth === 0) {
        let node = parent.cloneNode(true)
        node.innerHTML = ''
        return node
    }
    let node = parent.cloneNode(true)
    let { childNodes } = node;
	for (let i=childNodes.length - 1; i >= 0 ; i--){
        const { nodeType, tagName, innerHTML } = childNodes[i]
		if (nodeType === 1){
            if (['BUTTON', 'INPUT', 'SCRIPT', 'STYLE', 'FORM', 'UL', 'LI', 'OL', 'DL', 'TABLE', 'TR', 'TD', 'TH', 'THEAD', 'TBODY', 'TFOOT'].includes(tagName)) {
                node.removeChild(childNodes[i])
            } else {
                const ret = cleanChildrenNode(childNodes[i], maxdepth - 1)
                childNodes[i].innerHTML = ret.innerHTML
                // childNodes[i] = ret
            }
        }
    }
	return node
}

function getChildrenInfo (parent, depth) {
    let node = parent.cloneNode(true)
    depth = depth == null ? 0: depth

    let result = []
    let info = new Info()
    result[depth] = info

    let { childNodes } = node;
    for (let i=0; i< childNodes.length ; i++){
        const { nodeType, tagName, textContent, innerHTML } = childNodes[i]
        if (nodeType == 1){
            result[depth].tag[tagName] = (result[depth].tag[tagName] || 0) + 1
            if (['DIV', 'SECTION', 'UL', 'LI', 'OL', 'DL', 'SPAN', 'TABLE', 'TR', 'TH', 'TD', 'THEAD', 'TBODY', 'TFOOT'].includes(tagName)) {
                result[depth].count++
                const nextDepth = depth + 1
                const childrenInfo = getChildrenInfo(childNodes[i], nextDepth)
                if (childrenInfo) {
                    for(let index in childrenInfo) {
                        result[index] = result[index] || new Info()
                        result[index] = result[index].merge(childrenInfo[index])
                    }
                }
            } else {
                const text = cleanText(strip_tags(childNodes[i].innerHTML))
                if (text !== '') {
                    result[depth].text.push(text)
                    result[depth].total += text.length || 0
                }

            }
        } else if (nodeType === 3) {
            const text = cleanText(strip_tags(textContent))
            if (text !== '') {
                result[depth].text.push(text)
                result[depth].total += text.length || 0
            }
        }
    }
	return result
}
function removeDuplicationWord (text) {
    if (!text) {
        return ''
    }
    let sp = text.split(' ')
    if (sp.length === 1) {
        return ''
    }
    let result = sp.filter( (item, idx, array) => {
        return array.indexOf( item ) === idx
    })
    return result.join(' ')
}

function getInfo (parent) {
    let node = parent.cloneNode(true)
    let obj = cleanChildrenNode(node, 6)
    const cleanedText = cleanText(obj.innerHTML || '').trim()
    /*
    if (cleanedText !== '' || false) {
        console.log({
            cleanedObj: {
                html: cleanedText
            }
        })
    }
    */
    let text = cleanText(strip_tags(obj.innerHTML))
    const childrenInfo = getChildrenInfo(obj)
    if (childrenInfo.length === 0) {
        return null
    }
    let info = new Info()

	for (let i=0; i < childrenInfo.length; i++){
        info = info.merge(childrenInfo[i] || null)
    }
    if (!info) {
        return null
    }
    const count = (removeDuplicationWord(text || '').split(' ')).length
    if (count === 1) {
        return null
    }
    /*
    console.log('---------------------------------------------------------------')
    console.log({
        result: info,
        depth: childrenInfo.length
    })
    */
    const str = obj.innerHTML
    const re = /(<([^>]+)>)/ig
    const countTagInStr = ((str || '').match(re) || []).length
    /*
    console.log('>> result', {
        result1: info.tag, 
        result2: countTagInStr,
        html: obj.innerHTML.substring(0, 400)
    })
    */
    const tags = ['UL', 'LI', 'OL', 'DL', 'TABLE', 'TR', 'TH', 'TD', 'THEAD', 'TBODY', 'TFOOT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']
    let countTag = 0
    let countTagType = 0
    let addPoint = 0
    for (var key in info.tag) {
        if (tags.includes(key)) {
            countTag += info.tag[key] || 0
            countTagType++
        }
    }
    let score = count / (countTagType + 1) / (countTag + 1)
	return {
        node: parent,
        text: text,
        score: score,
        detail: {
            count: count,
            tag: info.tag,
            countTag: countTag,
            countTagType: countTagType,
            addPoint: addPoint
        }
    }
}

function strip_tags(input, allowed) {
    allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
    let tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}

module.exports = getArticle