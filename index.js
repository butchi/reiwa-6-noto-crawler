import puppeteer from 'puppeteer'
import Papa from 'papaparse'
import { DateTime } from 'luxon'
import Fs from 'fs'

const fs = Fs.promises

const handler = async _ => {
    const nowDate = DateTime.now()
    const nowDateStr = nowDate.toISO()

    const nowFileName = nowDate.startOf('second').toISO({
        format: 'basic',
        suppressMilliseconds: true,
        suppressSeconds: true,
        includeOffset: false,
    })

    const fetchUrlArr = []

    const timeoutMs = 45000

    const iterateLen = 5
    const scrapeLen = 5000

    await fs.appendFile(
        `${nowFileName}.log`,
        DateTime.now().toISO() + ' start' + '\n',
        {
            encoding: 'utf8',
        }
    )

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

    const actionKwArr = ['地震', '震災', '災害', '防災', '避難']

    const placeKwArr = ['能登', '北陸', '石川', '新潟', '富山', '福井'].concat(
        placeNameArr
    )

    const cnt = { value: 0 }

    const initExcludeCsv = {
        value: '',
        default: `
url,ttl,createdAt,updatedAt
`.slice(1, -1),
    }

    const initFragmentCsv = {
        value: '',
        default: `
url,place,ttl,desc,createdAt,updatedAt
`.slice(1, -1),
    }

    const initReadCsv = {
        value: '',
        default: `
url,matchAction,matchPlace,ttl,desc,createdAt,updatedAt
`.slice(1, -1),
    }

    const initUnreadCsv = {
        value: '',
        default: `
url,ttl,desc,createdAt,updatedAt
https://www.pref.ishikawa.lg.jp/shimachi.html,石川県内市町のページ | 石川県,,,
https://caidr.jp/2024/01/02/r6_noto/,令和6年能登半島地震における情報リンク集 – AI防災協議会,,,
https://www.mlit.go.jp/river/bousai/olympic/index.html,国土交通省　防災ポータル,,,
https://www.jishin.go.jp/link/,関連機関リンク | 地震本部,,,
`.slice(1, -1),
    }

    try {
        const fileNameArr = await fs.readdir('./')

        if (fileNameArr.includes('current-exclude.csv')) {
            initExcludeCsv.value = await fs.readFile('current-exclude.csv', {
                encoding: 'utf8',
            })
        }

        if (fileNameArr.includes('current-fragment.csv')) {
            initFragmentCsv.value = await fs.readFile('current-fragment.csv', {
                encoding: 'utf8',
            })
        }

        if (fileNameArr.includes('current-read.csv')) {
            initReadCsv.value = await fs.readFile('current-read.csv', {
                encoding: 'utf8',
            })
        }

        if (fileNameArr.includes('current-unread.csv')) {
            initUnreadCsv.value = await fs.readFile('current-unread.csv', {
                encoding: 'utf8',
            })
        }

        await fs.writeFile(
            `${nowFileName}-exclude.csv`,
            initExcludeCsv.value || initExcludeCsv.default,
            {
                encoding: 'utf8',
            }
        )

        await fs.writeFile(
            `${nowFileName}-fragment.csv`,
            initFragmentCsv.value || initFragmentCsv.default,
            {
                encoding: 'utf8',
            }
        )

        await fs.writeFile(
            `${nowFileName}-read.csv`,
            initReadCsv.value || initReadCsv.default,
            {
                encoding: 'utf8',
            }
        )

        await fs.writeFile(
            `${nowFileName}-unread.csv`,
            initUnreadCsv.value || initUnreadCsv.default,
            {
                encoding: 'utf8',
            }
        )
    } catch (err) {
        console.log('err: CSV file cannot read / write')

        await fs.appendFile(
            `${nowFileName}.log`,
            DateTime.now().toISO() + ' ' + err.toString() + '\n',
            {
                encoding: 'utf8',
            }
        )
        // console.log(err)
    }

    const { data: excludeData } = Papa.parse(
        initExcludeCsv.value || initExcludeCsv.default,
        {
            header: true,
        }
    )

    const { data: fragmentData } = Papa.parse(
        initFragmentCsv.value || initFragmentCsv.default,
        {
            header: true,
        }
    )

    const { data: readData } = Papa.parse(
        initReadCsv.value || initReadCsv.default,
        {
            header: true,
        }
    )

    const { data: unreadData } = Papa.parse(
        initUnreadCsv.value || initUnreadCsv.default,
        {
            header: true,
        }
    )

    const excludeLi = Object.fromEntries(
        excludeData.map(({ url, ttl, createdAt, updatedAt }) => [
            url,
            {
                url,
                ttl,
                createdAt,
                updatedAt,
            },
        ])
    )

    const fragmentLi = Object.fromEntries(
        fragmentData.map(({ url, place, ttl, desc, createdAt, updatedAt }) => [
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

    const readLi = Object.fromEntries(
        readData.map(
            ({
                url,
                matchAction,
                matchPlace,
                ttl,
                desc,
                createdAt,
                updatedAt,
            }) => [
                url,
                {
                    url,
                    matchAction,
                    matchPlace,
                    ttl,
                    desc,
                    createdAt,
                    updatedAt,
                },
            ]
        )
    )

    const unreadLi = Object.fromEntries(
        unreadData.map(({ url, ttl, desc, createdAt, updatedAt }) => [
            url,
            {
                url,
                ttl,
                desc,
                createdAt,
                updatedAt,
            },
        ])
    )

    const excludeUrlArr = Object.values(excludeLi).map(({ url }) => url)

    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    page.setDefaultNavigationTimeout(timeoutMs)

    const getPage = async url => {
        if (cnt.value > scrapeLen) {
            return
        }

        if (excludeUrlArr.includes(url)) {
            // console.log('skip: ', url)

            delete unreadLi[url]

            return
        }

        await new Promise(r => setTimeout(r, Math.random() * 15))

        console.info('fetch: ', url)
        fetchUrlArr.push(url)

        try {
            await page.goto(url)

            cnt.value++

            const titleElm = await page.$('title')
            const titleRes = await titleElm?.getProperty('innerText')
            const titleVal = await titleRes?.jsonValue()

            const pageTitleStr = typeof titleVal === 'string' ? titleVal : ''

            const mainQueryStr =
                'article, main, .contents, [id*="main" i], [class*="main" i], [class*="content" i], [class*="container" i], [class*="body" i], body'

            const mainElm = await page.$(mainQueryStr)

            const txtRes = await mainElm?.getProperty('innerText')
            const txtVal = await txtRes?.jsonValue()
            const txtVal1Line = txtVal
                ?.replaceAll(/[\s\t\u3000]+/g, ' ')
                ?.replaceAll('\n', '')
                ?.trim()

            const matchActionKwStr =
                actionKwArr
                    ?.filter(kw => txtVal1Line?.includes(kw))
                    ?.join('&') || ''
            const matchPlaceKwStr =
                placeKwArr
                    ?.filter(kw => txtVal1Line?.includes(kw))
                    ?.join('&') || ''

            const isMatchKw = matchActionKwStr && matchPlaceKwStr

            const urlObj = new URL(url)
            const normalUrl = `${urlObj.origin}${urlObj.pathname}`

            const ttl =
                pageTitleStr.replaceAll('\n', '')?.trim() || '無題のページ'

            if (isMatchKw) {
                const linkElmLi = await page.$$('a')

                placeNameArr.forEach(placeName => {
                    if (!txtVal1Line.includes(placeName)) {
                        return
                    }

                    const pos = txtVal1Line.indexOf(placeName) - 125

                    const startPos = Math.max(pos, 0)

                    const desc = txtVal1Line.slice(startPos, startPos + 150)

                    const urlWithFrag = normalUrl + '#:~:text=' + placeName

                    fragmentLi[urlWithFrag] = {
                        url: urlWithFrag,
                        place: placeName,
                        ttl,
                        desc,
                        createdAt: nowDateStr,
                        updatedAt: nowDateStr,
                    }

                    const createdAt =
                        fragmentLi[normalUrl]?.createdAt || nowDateStr

                    readLi[normalUrl] = {
                        url: normalUrl,
                        matchAction: matchActionKwStr,
                        matchPlace: matchPlaceKwStr,
                        ttl,
                        desc,
                        createdAt,
                        updatedAt: nowDateStr,
                    }

                    delete unreadLi[normalUrl]
                })

                for (const linkElm of linkElmLi) {
                    const labelRes = await linkElm.getProperty('innerText')
                    const hrefRes = await linkElm.getProperty('href')

                    const labelVal = await labelRes.jsonValue()
                    const labelValTrim = labelVal.replaceAll('\n', '').trim()
                    const hrefVal = await hrefRes.jsonValue()

                    if (!hrefVal) {
                        continue
                    }

                    const hrefObj = new URL(hrefVal)
                    const normalHref = `${hrefObj.origin}${hrefObj.pathname}`

                    const isNewcomer = fragmentLi[normalHref] == null

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

                    // TODO: 除外に限界があるので拡張子はホワイトリスト制にしたい
                    const isMatchExcludeExt = [
                        '.xml',
                        '.zip',
                        '.rdf',
                        '.xlsx',
                        '.docx',
                        '.xls',
                        '.doc',
                        '.csv',
                        '.rtf',
                        '.jpg',
                        '.jpeg',
                        '.png',
                    ].some(ext => hrefObj.pathname.endsWith(ext))

                    if (isMatchDomain && isNewcomer) {
                        const matchTtlActionKwStr = actionKwArr
                            .filter(kw => labelValTrim.includes(kw))
                            .join('&')
                        const matchTtlPlaceKwStr = placeKwArr
                            .filter(kw => labelValTrim.includes(kw))
                            .join('&')

                        const isMatchTtlKw =
                            matchTtlActionKwStr && matchTtlPlaceKwStr

                        if (isMatchPdf && isMatchTtlKw) {
                            const ttlLabel = labelValTrim

                            if (isMatchTtlKw) {
                                readLi[normalHref] = {
                                    url: normalHref,
                                    matchAction: matchTtlActionKwStr,
                                    matchPlace: matchTtlPlaceKwStr,
                                    ttl: ttlLabel,
                                    desc: `「${ttl}」(${hrefObj.hostname})からのPDFリンク`,
                                    createdAt: nowDateStr,
                                    updatedAt: nowDateStr,
                                }
                            }
                        } else if (!isMatchPdf && !isMatchExcludeExt) {
                            const ttlLabel = labelValTrim || '不明なページ'

                            unreadLi[normalHref] = {
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
                const ttlLabel = ttl || '不明なページ'

                const createdAt = excludeLi[normalUrl]?.createdAt || nowDateStr

                excludeLi[normalUrl] = {
                    url: normalUrl,
                    ttl: ttlLabel,
                    createdAt,
                    updatedAt: nowDateStr,
                }
            }
        } catch (err) {
            console.log('error: ', url)
            console.log(err)

            await fs.appendFile(
                `${nowFileName}.log`,
                DateTime.now().toISO() +
                    ' ' +
                    url +
                    ' ' +
                    err.toString() +
                    '\n',
                {
                    encoding: 'utf8',
                }
            )
        }
    }

    for (let i = 0; i < iterateLen; i++) {
        for (const item of Object.values(unreadLi)) {
            if (item?.url) {
                await getPage(item.url)
            }
        }
    }

    await browser.close()

    const idxItm = item => {
        if (item?.url == null) {
            return ''
        }

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

    if (Object.keys(excludeLi).length > 0) {
        const excludeCsvStr = Papa.unparse({
            fields: ['url', 'ttl', 'createdAt', 'updatedAt'],
            data: Object.values(excludeLi).sort((a, b) =>
                idxItm(a) > idxItm(b) ? 1 : -1
            ),
        })

        await fs.writeFile('current-exclude.csv', excludeCsvStr, {
            encoding: 'utf8',
        })
    }

    if (Object.keys(fragmentLi).length > 0) {
        const fragmentCsvStr = Papa.unparse({
            fields: ['url', 'place', 'ttl', 'desc', 'createdAt', 'updatedAt'],
            data: Object.values(fragmentLi).sort((a, b) =>
                idxItm(a) > idxItm(b) ? 1 : -1
            ),
        })

        await fs.writeFile('current-fragment.csv', fragmentCsvStr, {
            encoding: 'utf8',
        })
    }

    if (Object.keys(readLi).length > 0) {
        const readCsvStr = Papa.unparse({
            fields: [
                'url',
                'matchAction',
                'matchPlace',
                'ttl',
                'desc',
                'createdAt',
                'updatedAt',
            ],
            data: Object.values(readLi).sort((a, b) =>
                idxItm(a) > idxItm(b) ? 1 : -1
            ),
        })

        await fs.writeFile('current-read.csv', readCsvStr, { encoding: 'utf8' })
    }

    if (Object.keys(unreadLi).length > 0) {
        const unreadCsvStr = Papa.unparse({
            fields: ['url', 'ttl', 'desc', 'createdAt', 'updatedAt'],
            data: Object.values(unreadLi).sort((a, b) =>
                idxItm(a) > idxItm(b) ? 1 : -1
            ),
        })

        await fs.writeFile('current-unread.csv', unreadCsvStr, {
            encoding: 'utf8',
        })
    }

    await fs.appendFile(
        `${nowFileName}.log`,
        fetchUrlArr
            .map(url => DateTime.now().toISO() + ' ' + url + '\n')
            .join('') +
            DateTime.now().toISO() +
            ' end' +
            '\n',
        {
            encoding: 'utf8',
        }
    )
}

handler()
