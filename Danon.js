const puppeteer = require('puppeteer')

const addPoint = async (code) => {
  if (code.length !== 12) { return 'コードは12桁で入力してください。' }
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(`https://www.dan-on.com/jp-ja/my-danpoints?code=${code}`, {waitUntil: 'domcontentloaded'})
  await page.type('#signin-email', 'serendip001@icloud.com')
  await page.type('#signin-password', 'dp4530')
  await page.click('div.box__footer >  div.check-form > button[type="submit"]')
  await page.waitFor(8000)
  const result = await page.content().then(content => {
    let successFlag = /<header class="popin__header">/
    let pointMatch = /<strong>(\d*)<\/strong> ポイント<\/span>/
    if (content.match(successFlag)) {
      return `現在のポイントは、${content.match(pointMatch)[1]} です。`
    }
    return 'ポイントが間違っているか、使用済みの可能性があります。'
  })
  await browser.close()
  return result
}

export default addPoint()
