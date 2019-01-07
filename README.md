# html-article-extractor
A web page content extractor for News websites

# installation
```javascript
npm install html-article-extractor
```

# usage
```javascript
var htmlArticleExtractor = require("html-article-extractor");

var dom = new JSDOM("...");
var body = dom.window.document.body
result = htmlArticleExtractor(body);
console.log(result)
```

Outputs:
```
{
    html: '<div>contents</div>',
    text: 'contents'
}
```

# example
```javascript
git clone https://github.com/jungyoun/html-article-extractor
cd html-article-extractor
npm install
node example/crawler.js
```
