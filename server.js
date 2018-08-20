const express = require('express');
const line = require('@line/bot-sdk');
const puppeteer = require('puppeteer');
const PORT = process.env.PORT || 3000;

const config = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.CHANNEL_SECRET
};

const app = express();

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
	if (/^[d,D][n ]?([0-9]*)$/.test(userMessage)) {
		let code = RegExp.$1;
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
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();
	await page.goto(`https://www.dan-on.com/jp-ja/my-danpoints?code=${code}`, {
		waitUntil: 'domcontentloaded'
	});
	try {
		await page.type('#signin-email', process.env.DANON_USER_NAME);
		await page.type('#signin-password', process.env.DANON_PASSWORD);
		await page.click(
			'div.box__footer >  div.check-form > button[type="submit"]'
		);
	} catch (err) {
		return replyText(token, err.name + ': ' + err.message);
	}
	await page.waitFor(8000);
	const resultMessage = await page.content().then(content => {
		let successFlag = /<header class="popin__header">/;
		let pointMatch = /<strong>(\d*)<\/strong> ポイント<\/span>/;
		if (successFlag.test(content)) {
			return `現在のポイントは ${content.match(pointMatch)[1]} です。`;
		}
		return 'ポイントが間違っているか、使用済みの可能性があります。';
	});
	await browser.close();
	return replyText(token, resultMessage);
};

app.listen(PORT);
console.log(`Server running at ${PORT}`);
