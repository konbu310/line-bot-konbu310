const express = require("express");
const line = require("@line/bot-sdk");
const puppeteer = require("puppeteer");

const config = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

const app = express();

let RESULT_MESSAGE;
let RESULT_POINT;
const FAILURE_CHECK = /<p class="dn-icon-delete">/;
const SUCCESS_CHECK = /<p class="dn-icon-check">/;
const POINT_CHECK = /<strong>(\d*)<\/strong> ポイント<\/span>/;

app.get("/", (req, res) => {
	return res.send("問題なく稼働中です！");
});

app.post("/talk", line.middleware(config), (req, res) => {
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

const pushMessage = async message => {
	await client.pushMessage(process.env.GROUP_ID, {
		type: "text",
		text: message
	});
};

const handleEvent = async event => {
	if (event.type !== "message" || event.message.type !== "text") {
		return Promise.resolve(null);
	}

	if (/^(?:d|D|ダノン){1}([0-9]+)$/.test(event.message.text)) {
		if (RegExp.$1.length !== 12) {
			await pushMessage("コードは12桁だよ！\n間違ってないか確認して！");
			return Promise.resolve(null);
		}
		await addPoint(RegExp.$1);
	} else {
		return Promise.resolve(null);
	}

	return Promise.resolve(null);
};

const addPoint = async code => {
	await pushMessage("ポイント追加するね！");

	const browser = await puppeteer.launch({
		args: ["--no-sandbox"],
		ignoreHTTPSErrors: true
	});

	const page = await browser.newPage();

	try {
		await page.goto(`https://www.dan-on.com/jp-ja/my-danpoints?code=${code}`, {
			waitUntil: "domcontentloaded"
		});

		await page.waitFor(2 * 1000);

		await page.type("#signin-email", process.env.DANON_USER_NAME);
		await page.type("#signin-password", process.env.DANON_PASSWORD);

		await pushMessage("ポチポチ...\nもうちょっと待ってねφ(..)");

		await page.click(
			"#connect_form > div.box__footer.pushlog-form_cta > div > button"
		);

		await page.waitFor(10 * 1000);

		await page.content().then(content => {
			if (FAILURE_CHECK.test(content)) {
				RESULT_POINT = content.match(POINT_CHECK)[1];
				RESULT_MESSAGE = `コードが間違ってない？\nもしかしたら使用済みかも(;_:)`;
			} else if (SUCCESS_CHECK.test(content)) {
				RESULT_POINT = content.match(POINT_CHECK)[1];
				RESULT_MESSAGE = `ポイントを追加したよ！\n今のポイントは、${RESULT_POINT}だよ(´ε｀ )`;
			}
		});
	} catch (err) {
		console.log(err);
		RESULT_MESSAGE = "問題が起きてるみたい(´・ω・`)";
	}

	await pushMessage(RESULT_MESSAGE);

	await browser.close();

	return Promise.resolve(null);
};

const PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log(`Server running at ${PORT}`);
