const express = require('express');
const line = require('@line/bot-sdk');
const puppeteer = require('puppeteer');

const PORT = process.env.PORT || 3000;
const SUCCESS_CHECK = /<header class="popin__header">/;
const POINT_CHECK = /<strong>(\d*)<\/strong> ポイント<\/span>/;

let RESULT_MESSAGE;

const config = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

app.get('/', (req, res) => {
	res.send('問題なく動いています');
});

app.post('/talk', line.middleware(config), (req, res) => {
	if (!Array.isArray(req.body.events)) {
		return res.status(500).end();
	}

	Promise.all(req.body.events.map(handleEvent))
		.then(() => res.end())
		.catch(err => {
			console.error(err);
			res.status(500).end();
		});
});

const client = new line.Client(config);

const replyText = (token, message) => {
	return client.replyMessage(token, {
		type: 'text',
		text: message
	});
};

const handleEvent = event => {
	if (event.type !== 'message' || event.message.type !== 'text') {
		return Promise.resolve(null);
	}

	let userMessage = event.message.text;
	if (/^(?:d|D|ダノン){1}([0-9]+)$/.test(userMessage)) {
		let code = RegExp.$1;
		console.log(code);
		if (code.length !== 12) {
			return replyText(event.replyToken, 'コードは12桁で入力してください。');
		}
		return addPoint(event.replyToken, code);
	} else {
		return Promise.resolve(null);
	}
};

const addPoint = async (token, code) => {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox'],
		ignoreHTTPSErrors: true
	});
	const page = await browser.newPage();

	try {
		await page.goto(`https://www.dan-on.com/jp-ja/my-danpoints?code=${code}`, {
			waitUntil: 'domcontentloaded'
		});

		await page.waitFor(2 * 1000);

		await page.type('#signin-email', process.env.DANON_USER_NAME);
		await page.type('#signin-password', process.env.DANON_PASSWORD);

		await page.click(
			'div.box__footer >  div.check-form > button[type="submit"]'
		);

		await page.waitFor(10 * 1000);

		await page.content().then(content => {
			RESULT_MESSAGE = SUCCESS_CHECK.test(content)
				? `現在のポイントは ${content.match(POINT_CHECK)[1]} です。`
				: 'コードが間違っているか、使用済みの可能性があります。';
		});
	} catch (err) {
		console.log(err);
		RESULT_MESSAGE = 'エラーが発生しました。';
	}

	await browser.close();
	return replyText(token, RESULT_MESSAGE);
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
