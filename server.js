const express = require('express')
const line = require('@line/bot-sdk')
const PORT = process.env.PORT || 3000
const Danon = require('./Danon')

const config = {
  channelAccessToken: 'S6jOttKiR5kfz6HxunhVm41qErLs/IsKDbbO2/lJ7zRyepQgcMDQOJyb6Mb4jE4MGguTDyFDAFu4rQ4BHnb/f+JEwByqh/gZqu9sOo2KUyfNyjkAX0V/OKmvoUvp1U1r6YcV5Si2ump4X8VpEksfzAdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'e9af9dcb1d398998f9ffefc889fc4686'
}

const app = express()

app.post('/talk', line.middleware(config), (req, res) => {
  console.log(req.body.events)
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
})

const client = new line.Client(config)

const handleEvent = (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null)
  }

  let userMessage = event.message.text
  switch (true) {
    // ダノンポイント関係
    case /^[d,D]n[ ]?([0-9]*)$/.test(userMessage):
      let code = RegExp.$1
      let result = Danon.addPoint(code)
      sendMessage(result, event.replyToken)
      break
    default:
      return Promise.resolve(null)
  }
}

const sendMessage = (message, replyToken) => {
  return client.replyMessage(replyToken, {
    type: 'text',
    text: message
  })
}

app.listen(PORT)
console.log(`Server running at ${PORT}`)
