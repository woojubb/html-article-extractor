# html-article-extractor

Synchronous DOM article extraction for Node.js. The package uses Mozilla Readability with a text/link-density fallback and returns normalized HTML and text.

```javascript
const getArticle = require('html-article-extractor')

const result = getArticle(document)
console.log(result.html, result.text)
```

Requires Node.js 20 or later. The returned HTML is not sanitized; sanitize untrusted output before browser rendering.
