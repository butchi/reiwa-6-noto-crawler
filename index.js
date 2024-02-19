// Import puppeteer
import { url } from 'inspector'
import puppeteer from 'puppeteer'
import Papa from 'papaparse'

const kwArr = ['能登', '地震', '防災']

const cnt = { value: 0 }

const initCsvStr = `
url,ttl,desc
https://www.kantei.go.jp/,,
https://www.bousai.go.jp/,,
https://www.gov-online.go.jp/,,
`.slice(1, -1)

const { data } = Papa.parse(initCsvStr, {
    header: true,
})

const li = Object.fromEntries(
    data.map(({ url, ttl, desc }) => [
        url,
        {
            url,
            ttl,
            desc,
        },
    ])
)

const handler = async _ => {
    // Launch the browser
    const browser = await puppeteer.launch()

    // Create a page
    const page = await browser.newPage()

    const getPage = async url => {
        new Promise(r => setTimeout(r, 15))

        // console.info('fetch: ', url)

        try {
            if (cnt.value > 25000) {
                return
            }

            // Go to your site
            await page.goto(url)

            cnt.value++

            const titleElm = await page.$('title')
            const titleRes = await titleElm?.getProperty('innerText')
            const titleVal = await titleRes?.jsonValue()

            const pageTitleStr = typeof titleVal === 'string' ? titleVal : ''

            const articleElm = await page.$('article')
            const mainElm = await page.$('main')
            const bodyElm = await page.$('body')

            const elm = articleElm || mainElm || bodyElm

            const txtRes = await elm.getProperty('innerText')
            const txtVal = await txtRes.jsonValue()

            const matchKw = kwArr.some(kw => txtVal.includes(kw))

            if (matchKw) {
                const urlObj = new URL(url)
                const normalUrl = `${urlObj.origin}${urlObj.pathname}`

                const linkElmLi = await page.$$('a')

                li[url] = {
                    url: normalUrl,
                    ttl: pageTitleStr.replaceAll('\n', '')?.trim(),
                    desc: txtVal.slice(0).replaceAll('\n', '') || '',
                }

                for (const linkElm of linkElmLi) {
                    // const txtRes = await linkElm.getProperty('innerText')
                    const hrefRes = await linkElm.getProperty('href')

                    // const txtVal = await txtRes.jsonValue()
                    const hrefVal = await hrefRes.jsonValue()

                    const hrefObj = new URL(hrefVal)
                    const normalHref = `${hrefObj.origin}${hrefObj.pathname}`

                    const matchHref = [
                        '.go.jp',
                        '.lg.jp',
                        '.ishikawa.jp',
                        '.toyama.jp',
                        '.fukui.jp',
                        '.niigata.jp',
                        '.hodatsushimizu.jp',
                    ].some(domain => hrefObj.origin.endsWith(domain))

                    if (li[normalHref] == null && matchHref) {
                        li[normalHref] = {
                            url: normalHref,
                            ttl: '',
                            desc: '',
                        }
                    }
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

    for (const item of Object.values(li)) {
        if (item.ttl == '') {
            await getPage(item.url)
        }
    }

    for (const item of Object.values(li)) {
        if (item.ttl == '') {
            await getPage(item.url)
        }
    }

    for (const item of Object.values(li)) {
        if (item.ttl == '') {
            await getPage(item.url)
        }
    }

    // Close browser.
    await browser.close()
}

await handler()

const idxItm = item => {
    const { host, pathname } = new URL(item.url)

    const prefix = item.desc === '' ? '-' : '! '

    return prefix + host.split('.').reverse().join('/') + ' ' + pathname
}

const csvStr = Papa.unparse({
    fields: ['url', 'ttl', 'desc'],
    data: Object.values(li).sort((a, b) => (idxItm(a) > idxItm(b) ? 1 : -1)),
})

console.log(csvStr)
// console.log(Object.entries(li).length)
