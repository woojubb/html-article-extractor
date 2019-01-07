function Info () {
    this.tag = {}
    this.text = []
    this.count = 0
    this.total = 0
    this.merge = function (info) {
        if (!info) {
            return this
        }
        var temp = {
            tag: this.tag,
            text: this.text,
            count: this.count,
            total: this.total
        }
        for(let tagName in info.tag) {
            this.tag[tagName] = (this.tag[tagName] || 0) + (info.tag[tagName] || 0)
        }
        this.text = this.text.concat(info.text)
        this.count += info.count
        this.total += info.total
        /*
        console.log({
            merged: {
                originalInfo: temp,
                newInfo: info,
                finalInfo: this
            }
        })
        */
        return this
    }
}

module.exports = Info
