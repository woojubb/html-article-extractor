const request = require('request')
const jsdom = require('jsdom')
const Buffer  = require('buffer').Buffer
const detectCharacterEncoding = require('detect-character-encoding')
const charset = require('charset')
const _ = require('lodash')
const htmlArticleExtractor = require('../src')

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
            let enc = charset(res.headers || null, body)
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
        'https://news.joins.com/article/23258019?cloc=joongang|home|newslist1',
        'http://www.ddaily.co.kr/news/article.html?no=176561',
        'http://news.hankyung.com/article/201901038780g',
        'http://www.etoday.co.kr/news/section/newsview.php?idxno=1706769',
        'http://news.mk.co.kr/newsRead.php?year=2019&no=4529',
        'http://www.inews24.com/view/1149222',
        'http://www.newsis.com/view/?id=NISX20190103_0000519767&cID=13001&pID=13000',
        'http://www.segye.com/newsView/20190103000690',
        'http://www.ddaily.co.kr/news/article.html?no=176561',
        'http://www.etnews.com/20190102000293',
        'http://news.khan.co.kr/kh_news/khan_art_view.html?artid=201901030600055&code=910303',
        'http://news.kmib.co.kr/article/view.asp?arcid=0924053946&code=11131100&cp=nv',
        'http://news.donga.com/3/all/20190102/93535636/1',
        'http://www.munhwa.com/news/view.html?no=2019010301070103018001',
        'http://www.seoul.co.kr/news/newsView.php?id=20190103001010&wlog_tag3=naver',
        'http://www.hani.co.kr/arti/politics/politics_general/876779.html',
        'http://www.journalist.or.kr/news/article.html?no=45550',
        'http://time.com/5486673/bitcoin-venezuela-authoritarian/',
        'https://twitter.com/i/web/status/1080840232902320128'
    ]
    /*
    urls = [
        ,
        'https://www.coindesk.com/bittorrent-is-launching-its-own-cryptocurrency-on-the-tron-network?utm_source=dlvr.it&utm_medium=twitter',
        'https://cointelegraph.com/news/bitcoin-vs-traditional-assets-how-does-cryptos-10-year-performance-sync-up'
    ]
    */
    // urls = [ 'https://twitter.com/i/web/status/1080840232902320128']
    // urls = [ 'http://news.hankyung.com/article/201901038780g' ]
    // urls = [ 'http://news1.kr/articles/?3515212' ]
    // urls = [ 'http://biz.chosun.com/site/data/html_dir/2019/01/02/2019010202230.html' ]
    //urls = []
    // urls = [ 'http://www.munhwa.com/news/view.html?no=2019010301070103018001' ]
    // urls = [ 'https://twitter.com/i/web/status/1080840232902320128' ]
    for (let i=0;i<urls.length;i++) {
        await crawling(urls[i])
    }
    
}

async function crawling (url) {
    console.log('========================================================')
    console.log({ url: url })
    console.log('--------------------------------------------------------')
    const contents = await getContents(url)
    const text = contents.body || ''
    const dom = new JSDOM(text)
    let window = dom.window
    let document = window.document
    const article = htmlArticleExtractor(document.body)
    console.log({ result: article.text })
    console.log('========================================================')
}

run();