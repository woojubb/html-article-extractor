var DEBUG_MODE = true
var best = null
var Info = require('./struct/info')

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
    var childNodes = node.childNodes
	for (var i=0; i < childNodes.length; i++){
        var tagName = childNodes[i].tagName
        var nodeType = childNodes[i].nodeType
		if (nodeType == 1){
			if (['DIV', 'ARTICLE', 'MAIN'].indexOf(tagName) > -1){
                var info = getInfo(childNodes[i]);
                if (info) {
                    if (best.score <= info.score){
                        best = {
                            node: childNodes[i],
                            text: info.text,
                            score: info.score,
                            detail: info.detail
                        }
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
        var node = parent.cloneNode(true)
        node.innerHTML = ''
        return node
    }
    var node = parent.cloneNode(true)
    var childNodes = node.childNodes;
	for (var i=childNodes.length - 1; i >= 0 ; i--){
        var tagName = childNodes[i].tagName
        var nodeType = childNodes[i].nodeType
		if (nodeType === 1){
            if (childNodes[i].hasAttributes()) {
                for (var j=childNodes[i].attributes.length - 1;j>=0;j--) {
                    childNodes[i].removeAttribute(childNodes[i].attributes[j].name)
                }
            }
            if (['BUTTON', 'INPUT', 'SCRIPT', 'STYLE', 'FORM', 'UL', 'LI', 'OL', 'DL', 'TABLE', 'TR', 'TD', 'TH', 'THEAD', 'TBODY', 'TFOOT', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'NOSCRIPT'].indexOf(tagName) > -1) {
                node.removeChild(childNodes[i])
            } else {
                var ret = cleanChildrenNode(childNodes[i], maxdepth - 1)
                childNodes[i].innerHTML = ret.innerHTML
            }
        }
    }
	return node
}

function getChildrenInfo (parent, depth) {
    var node = parent.cloneNode(true)
    depth = depth == null ? 0: depth

    var result = []
    var info = new Info()
    result[depth] = info

    var childNodes = node.childNodes;
    for (var i=0; i< childNodes.length ; i++){
        var tagName = childNodes[i].tagName
        var nodeType = childNodes[i].nodeType
        var textContent = childNodes[i].textContent
        if (nodeType == 1){
            result[depth].tag[tagName] = (result[depth].tag[tagName] || 0) + 1
            if (['DIV', 'SECTION', 'UL', 'LI', 'OL', 'DL', 'SPAN', 'TABLE', 'TR', 'TH', 'TD', 'THEAD', 'TBODY', 'TFOOT', 'ASIDE', 'HEADER', 'FOOTER', 'NAV'].indexOf(tagName) > -1) {
                result[depth].count++
                var nextDepth = depth + 1
                var childrenInfo = getChildrenInfo(childNodes[i], nextDepth)
                if (childrenInfo) {
                    for(var index in childrenInfo) {
                        result[index] = result[index] || new Info()
                        result[index] = result[index].merge(childrenInfo[index])
                    }
                }
            } else {
                var text = cleanText(strip_tags(childNodes[i].innerHTML))
                if (text !== '') {
                    result[depth].text.push(text)
                    result[depth].total += text.length || 0
                }

            }
        } else if (nodeType === 3) {
            var text = cleanText(strip_tags(textContent))
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
    var sp = text.split(' ')
    if (sp.length === 1) {
        return ''
    }
    var result = sp.filter( (item, idx, array) => {
        return array.indexOf( item ) === idx
    })
    return result.join(' ')
}

function getInfo (parent) {
    var node = parent.cloneNode(true)
    var obj = cleanChildrenNode(node, 6)
    var text = cleanText(strip_tags(obj.innerHTML))
    var childrenInfo = getChildrenInfo(obj)
    if (childrenInfo.length === 0) {
        return null
    }
    var info = new Info()

	for (var i=0; i < childrenInfo.length; i++){
        info = info.merge(childrenInfo[i] || null)
    }
    if (!info) {
        return null
    }
    var count = (removeDuplicationWord(text || '').split(' ')).length
    if (count === 1) {
        return null
    }

    var tags = ['UL', 'LI', 'OL', 'DL', 'TABLE', 'TR', 'TH', 'TD', 'THEAD', 'TBODY', 'TFOOT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']
    var advantageTag = ['BLOCKQUOTE', 'SECTION', 'ARTICLE', 'MAIN', 'BR', 'HR', 'INS', 'DEL']
    var countTag = 0
    var countTagType = 0
    var addPoint = 0
    for (var key in info.tag) {
        if (tags.indexOf(key) > -1) {
            countTag += info.tag[key] || 0
            countTagType++
        } else if (advantageTag.indexOf(key) > -1) {
            addPoint += info.tag[key] || 0
        }
    }
    var score = count / (countTagType + 1) / (countTag + 1)
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
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function($0, $1) {
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}

module.exports = getArticle