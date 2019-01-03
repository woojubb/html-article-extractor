let best = {}

function getArticle (dom) {
    initBestArticle()
    analyzeNode(dom)
    return best
}

function initBestArticle () {
    best = {
        count: -1,
        countTagType: -1,
        countTag: -1
    }
}

function analyzeNode(node){
	const { childNodes } = node
	for (let i=0; i < childNodes.length; i++){
        const { tagName, nodeType } = childNodes[i]
		if (nodeType == 1){
			if (['DIV', 'ARTICLE', 'SECTION'].includes(tagName)){
                const info = getInfo(childNodes[i]);
                if (info) {
                    const score1 = best.count / best.countTagType / best.countTag
                    const score2 = info.count / info.countTagType / info.countTag
                    if (info.countTag > 0 && best.count < info.count && score1 < score2){
                        best = info
                    } 
                }
			}
        }
		analyzeNode(childNodes[i]);
    }
}

function cleanText(text) {
    text = text.replace(/&nbsp;/gi, ' ')
    text = text.replace(/\r+/g, ' ')
    text = text.replace(/\n+/g, ' ')
    text = text.replace(/\t+/g, ' ')
    text = text.replace(/\s+/g, ' ')
    return text.trim()
}

function cleanChildrenNode(parent, maxDeepLevel){
    if (maxDeepLevel === 0) {
        let node = parent.cloneNode(true)
        node.innerHTML = ''
        return node
    }
    let node = parent.cloneNode(true)
    let { childNodes } = node;
	for (let i=childNodes.length - 1; i >= 0 ; i--){
        const { nodeType, tagName } = childNodes[i]
		if (nodeType == 1){
            if (['DIV', 'UL', 'LI', 'OL', 'DL'].includes(tagName)) {
                const ret = cleanChildrenNode(childNodes[i], maxDeepLevel - 1)
                childNodes[i].innerHTML = ret.innerHTML
            } else if (!['A', 'SPAN', 'P', 'BR'].includes(tagName)) {
                node.removeChild(childNodes[i])
            }
        }
    }
	return node
}

function getChildrenInfo (parent) {
    let info = {
        tag: {},
        text: [],
        count: 0,
        total: 0
    }

    let node = parent.cloneNode(true)
    let { childNodes } = node;
    for (let i=0; i< childNodes.length ; i++){
        const { nodeType, tagName, textContent } = childNodes[i]
        if (nodeType == 1){
            info.tag[tagName] = (info.tag[tagName] || 0) + 1
            info.count++
            if (['DIV', 'UL', 'LI', 'OL', 'DL'].includes(tagName)) {
                const childrenInfo = getChildrenInfo(childNodes[i])
                if (childrenInfo) {
                    for(let tagName in childrenInfo.tag) {
                        info.tag[tagName] = (info.tag[tagName] || 0) + (childrenInfo.tag[tagName] || 0)
                    }
                    info.text = info.text.concat(childrenInfo.text)
                    info.count += childrenInfo.count
                    info.total += childrenInfo.total
                }
            } else {
                const text = cleanText(textContent)
                if (text !== '') {
                    info.text.push(text)
                    info.total += text.length || 0
                }
            }
        } else if (nodeType === 3) {
            const text = cleanText(textContent)
            if (text !== '') {
                info.text.push(text)
                info.total += text.length || 0
            }
        }
    }
	return info
}
function getInfo (parent) {
    let node = parent.cloneNode(true)
    node.innerHTML = strip_tags(node.innerHTML, '<a><p></p><br><div><li><ol><ul><dl><script><style>')
    let obj = cleanChildrenNode(node, 3)
    let text = cleanText(strip_tags(obj.innerHTML))
    const info = getChildrenInfo(obj)
    const count = (text.split(' ')).length
    if (count === 1) {
        return null
    }
    const tags = ['DIV', 'UL', 'LI', 'OL', 'DL']
    let countTag = 0
    for (let i=0;i<tags.length;i++) {
        countTag += info.tag[tags[i]] || 0
    }
    if (countTag === 0) {
        return null
    }
    const countTagType = Object.keys(info.tag).length
	return {
        node: parent,
        text: text,
        count: count,
        countTag: countTag,
        countTagType: countTagType
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