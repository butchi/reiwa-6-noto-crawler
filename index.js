import puppeteer from 'puppeteer'
import Papa from 'papaparse'
import fs from 'fs'

const handler = async _ => {
    const nowDate = new Date()
    const nowDateStr = nowDate.toISOString()

    const timeoutMs = 45000

    const iterateLen = 3
    const scrapeLen = 250

    const placeNameArr = [
        '志賀',
        '七尾',
        '輪島',
        '珠洲',
        '穴水',
        '中能登',
        '能登町',
        '金沢市',
        '小松',
        '加賀市',
        '羽咋市',
        'かほく',
        '能美市',
        '宝達志水',
        '長岡',
        '中央区',
        '南区',
        '西区',
        '西蒲区',
        '三条',
        '柏崎',
        '見附',
        '燕市',
        '糸魚川',
        '妙高',
        '上越市',
        '佐渡',
        '南魚沼',
        '阿賀',
        '刈羽',
        '富山市',
        '高岡',
        '氷見',
        '小矢部',
        '南砺',
        '射水',
        '舟橋',
        'あわら',
    ]

    const kwTbl = [
        ['能登', '北陸', '石川', '新潟', '富山', '福井'].concat(placeNameArr),
        ['地震', '震災', '災害', '防災', '避難'],
    ]

    const cnt = { value: 0 }

    const initCsv = {
        value: '',
        default: `
url,ttl,desc,createdAt,updatedAt
https://www.pref.ishikawa.lg.jp/shimachi.html,石川県内市町のページ | 石川県,,,
https://caidr.jp/2024/01/02/r6_noto/,令和6年能登半島地震における情報リンク集 – AI防災協議会,,,
https://www.mlit.go.jp/river/bousai/olympic/index.html,国土交通省　防災ポータル,,,
https://www.jishin.go.jp/link/,関連機関リンク | 地震本部,,,
`.slice(1, -1),
    }

    const nowFileName = nowDate
        .toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
        .replace(/\s/, 'T')
        .replaceAll(/[/:]/g, '')

    try {
        initCsv.value = fs.readFileSync('./sheet.csv', { encoding: 'utf8' })
    } catch (err) {
        console.log('err: CSV file cannot open')
        // console.log(err)
    }

    fs.writeFileSync(`${nowFileName}.csv`, initCsv.value || initCsv.default, {
        encoding: 'utf8',
    })

    const { data } = Papa.parse(initCsv.value || initCsv.default, {
        header: true,
    })

    const li = Object.fromEntries(
        data.map(({ url, place, ttl, desc, createdAt, updatedAt }) => [
            url,
            {
                url,
                place,
                ttl,
                desc,
                createdAt,
                updatedAt,
            },
        ])
    )

    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    page.setDefaultNavigationTimeout(timeoutMs)

    const getPage = async url => {
        new Promise(r => setTimeout(r, Math.random() * 15))

        console.info('fetch: ', url)

        try {
            if (cnt.value > scrapeLen) {
                return
            }

            await page.goto(url)

            cnt.value++

            const titleElm = await page.$('title')
            const titleRes = await titleElm?.getProperty('innerText')
            const titleVal = await titleRes?.jsonValue()

            const pageTitleStr = typeof titleVal === 'string' ? titleVal : ''

            const mainQueryStr =
                'article, main, .contents [class*="main" i], [class*="content" i], [class*="container" i], [class*="container" i], [class*="body" i], body'

            const mainElm = await page.$(mainQueryStr)

            const txtRes = await mainElm.getProperty('innerText')
            const txtVal = await txtRes.jsonValue()
            const txtVal1Line = txtVal
                .replaceAll(/[\s\t\u3000]+/g, ' ')
                .replaceAll('\n', '')
                ?.trim()

            const isMatchKw = kwTbl.every(kwArr =>
                kwArr.some(kw => txtVal1Line.includes(kw))
            )

            const urlObj = new URL(url)
            const normalUrl = `${urlObj.origin}${urlObj.pathname}`

            if (isMatchKw) {
                const ttl =
                    pageTitleStr.replaceAll('\n', '')?.trim() || '無題のページ'

                const linkElmLi = await page.$$('a')

                placeNameArr.forEach(placeName => {
                    if (!txtVal1Line.includes(placeName)) {
                        return
                    }

                    const pos = txtVal1Line.indexOf(placeName) - 125

                    const startPos = Math.max(pos, 0)

                    const desc = txtVal1Line.slice(startPos, startPos + 150)

                    const urlWithFrag = normalUrl + '#:~:text=' + placeName

                    li[urlWithFrag] = {
                        url: urlWithFrag,
                        place: placeName,
                        ttl,
                        desc,
                        createdAt: nowDateStr,
                        updatedAt: nowDateStr,
                    }

                    const { createdAt } = li[normalUrl] || nowDateStr

                    li[normalUrl] = {
                        url: normalUrl,
                        ttl,
                        desc: '',
                        createdAt,
                        updatedAt: nowDateStr,
                    }
                })

                for (const linkElm of linkElmLi) {
                    const labelRes = await linkElm.getProperty('innerText')
                    const hrefRes = await linkElm.getProperty('href')

                    const labelVal = await labelRes.jsonValue()
                    const labelValTrim = labelVal.replaceAll('\n', '').trim()
                    const hrefVal = await hrefRes.jsonValue()

                    const hrefObj = new URL(hrefVal)
                    const normalHref = `${hrefObj.origin}${hrefObj.pathname}`

                    const isNewcomer = li[normalHref] == null

                    const isMatchDomain = [
                        '.go.jp',
                        '.lg.jp',
                        '.ishikawa.jp',
                        '.toyama.jp',
                        '.fukui.jp',
                        '.niigata.jp',
                        '.hodatsushimizu.jp',
                        '.caidr.jp',
                        // '.ac.jp',
                    ].some(domain => hrefObj.origin.endsWith(domain))

                    const isMatchPdf = hrefObj.pathname.endsWith('.pdf')
                    const isMatchBlackExt = [
                        '.xml',
                        '.zip',
                        '.rdf',
                        '.xls',
                        '.xlsm',
                        '.xlsx',
                        '.doc',
                        '.docm',
                        '.docx',
                        '.ppt',
                        '.pptm',
                        '.pptx',
                        '.jpg',
                        '.jpeg',
                        '.png',
                    ].some(ext => hrefObj.pathname.endsWith(ext))

                    if (isMatchDomain && isNewcomer) {
                        const isMatchTtlKw = kwTbl.every(kwArr =>
                            kwArr.some(kw => labelValTrim.includes(kw))
                        )

                        if (isMatchPdf && isMatchTtlKw) {
                            const ttlLabel = labelValTrim

                            if (isMatchTtlKw) {
                                li[normalHref] = {
                                    url: normalHref,
                                    ttl: ttlLabel,
                                    desc: `「${ttl}」(${hrefObj.hostname})からのPDFリンク`,
                                    createdAt: nowDateStr,
                                    updatedAt: nowDateStr,
                                }
                            }
                        } else if (!isMatchPdf && !isMatchBlackExt) {
                            const ttlLabel = labelValTrim || '不明なページ'

                            li[normalHref] = {
                                url: normalHref,
                                ttl: ttlLabel,
                                desc: `「${ttl}」(${hrefObj.hostname})からのページリンク`,
                                createdAt: nowDateStr,
                                updatedAt: '',
                            }
                        }
                    }
                }
            } else {
                const { createdAt } = li[normalUrl] || nowDateStr

                li[normalUrl] = {
                    url: normalUrl,
                    ttl: '',
                    desc: '',
                    createdAt,
                    updatedAt: nowDateStr,
                }
            }
        } catch (err) {
            // console.log('error: ', url)
            // console.log(err)
        }

        // // Do something with element...
        // await element.click() // Just an example.

        // // Dispose of handle
        // await element.dispose()
    }

    for (let i = 0; i < iterateLen; i++) {
        for (const item of Object.values(li)) {
            if (item.updatedAt == '') {
                await getPage(item.url)
            }
        }
    }

    await browser.close()

    const idxItm = item => {
        const { host, pathname } = new URL(item.url)

        const prefix = [
            item.place === '',
            pathname.endsWith('.pdf'),
            item.ttl === '',
            item.desc === '',
            item.updatedAt === '',
        ]
            .map(bool => (bool ? '-' : '!'))
            .join('')

        return (
            prefix +
            host.split('.').reverse().join('/') +
            ' ' +
            pathname +
            ' ' +
            item.place
        )
    }

    const csvStr = Papa.unparse({
        fields: ['url', 'place', 'ttl', 'desc', 'createdAt', 'updatedAt'],
        data: Object.values(li).sort((a, b) =>
            idxItm(a) > idxItm(b) ? 1 : -1
        ),
    })

    fs.writeFileSync('sheet.csv', csvStr, { encoding: 'utf8' })
    // console.log(Object.entries(li).length)
}

handler()
