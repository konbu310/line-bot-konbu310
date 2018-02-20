const express = require('express')
const line = require('@line/bot-sdk')
const puppeteer = require('puppeteer')
const PORT = process.env.PORT || 3000

const config = {
  channelAccessToken: 'S6jOttKiR5kfz6HxunhVm41qErLs/IsKDbbO2/lJ7zRyepQgcMDQOJyb6Mb4jE4MGguTDyFDAFu4rQ4BHnb/f+JEwByqh/gZqu9sOo2KUyfNyjkAX0V/OKmvoUvp1U1r6YcV5Si2ump4X8VpEksfzAdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'e9af9dcb1d398998f9ffefc889fc4686'
}

const app = express()

app.post('/talk', line.middleware(config), (req, res) => {
  // req.body.events should be an array of events
  if (!Array.isArray(req.body.events)) {
    return res.status(500).end()
  }

  // handle events separately
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.end())
    .catch((err) => {
      console.error(err)
      res.status(500).end()
    })
})

const client = new line.Client(config)

const replyText = (token, message) => {
  return client.replyMessage(token,
    {
      type: 'text',
      text: message
    })
}

const handleEvent = (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null)
  }

  if (/^[d,D][n ]?([0-9]*)$/.test(event.message.text)) {
    let code = RegExp.$1
    if (code.length !== 12) { replyText(event.replyToken, 'コードは12桁で入力してください。') }
    replyText(event.replyToken, code)
  }
}

const addPoint = async (code, token) => {
  if (code.length !== 12) { return client.replyMessage(token, 'コードは12桁で入力してください。') }
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
    if (successFlag.test(content)) {
      return `現在のポイントは、${content.match(pointMatch)[1]} です。`
    }
    return 'ポイントが間違っているか、使用済みの可能性があります。'
  })
  await browser.close()
  return client.replyMessage(token, result)
}

app.listen(PORT)
console.log(`Server running at ${PORT}`)

/*
/^[d,D]n[ ]?([0-9]*)$/.test(event.message.text))
addPoint(RegExp.$1, event.replyToken)
*/
