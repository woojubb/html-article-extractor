const request = require('request')
const jsdom = require('jsdom')
const Buffer  = require('buffer').Buffer
const detectCharacterEncoding = require('detect-character-encoding')
const charset = require('charset')
const _ = require('lodash')
const getArticle = require('../src')

const iconv = require('iconv-lite') 

const { JSDOM } = jsdom;

async function getContents(url){
    var options = {
        uri: url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'
        },
        encoding: null,
        strictSSL: false,
        followRedirect: false,
        timeout: 10000
    };
    try {
        return await doRequest(options);
    } catch (e) {
        console.log('request error: ', e.message)
    }
}

function doRequest(options) {
    return new Promise(function (resolve, reject) {
        request(options, function (error, res, body) {
            if (error) {
                reject(error)
            }
            let enc = charset(res.headers, body)
            if (!enc) {
                enc = detectCharacterEncoding(Buffer.from(body)).encoding
            }
            const result = ['utf8', 'UTF-8'].includes(enc) ? body.toString() : iconv.decode(body, enc)
            resolve({
                response: res,
                body: result
            })
        })
    })
}

async function run () {
    let urls = [
        'http://www.zdnet.co.kr/view/?no=20181228143240',
        'http://www.dt.co.kr/contents.html?article_no=2019010202100457798001&naver=stand',
        'http://www.bloter.net/archives/327297',
        'https://www.mysmartprice.com/gear/huawei-y7-pro-2019-snapdragon-450-6-26-inch-dewdrop-notch-display-launched-price-features/',
        'https://www.phonearena.com/news/Nokia-9-PureView-promo-video-leaked_id112327',
        'http://news1.kr/articles/?3515212',
        'http://betanews.heraldcorp.com:8080/article/955080.html',
        'http://biz.chosun.com/site/data/html_dir/2019/01/02/2019010202230.html',
        'https://news.naver.com/main/read.nhn?mode=LSD&mid=sec&sid1=100&oid=001&aid=0010558528',
        'http://www.enewstoday.co.kr/news/articleView.html?idxno=1259522',
        'https://m.blog.naver.com/PostView.nhn?blogId=jeuncc&logNo=221428966405&navType=tl',
        'http://wishgone.tistory.com/entry/%EC%97%98%EB%9D%BC%EC%8A%A4%ED%8B%B1%EC%84%9C%EC%B9%98-elasticsearch-%EB%A9%94%EB%AA%A8%EB%A6%AC-%EA%B4%80%EB%A0%A8-%EA%B3%B5%EC%8B%9D-%ED%99%88%ED%94%BC-%EB%B2%88%EC%97%AD',
        'https://news.joins.com/article/23258019?cloc=joongang|home|newslist1'
    ]
    for (let i=0;i<urls.length;i++) {
        await crawling(urls[i])
    }
}
async function crawling (url) {
    console.log('========================================================')
    console.log('>> url', url)
    console.log('--------------------------------------------------------')
    const contents = await getContents(url)
    const text = contents.body || ''
    const dom = new JSDOM(text)
    let window = dom.window
    let document = window.document
    const article = getArticle(document.body)
    console.log('>> result', _.get(article, 'text', ''))
    console.log('========================================================')
}

run();