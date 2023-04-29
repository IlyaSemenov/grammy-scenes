/*

> /start

Welcome to Main Scene

First captcha is obligatory

You must solve captcha !

Enter the letters you see below: (a)

> b

Try again!

> a

Captcha solved!

You are not lucky, you must solve second captcha

You must solve captcha !

Enter the letters you see below: (a)

Captcha solved!

Do you want to try your luck once again?

> YES

You are not lucky, you must solve second captcha

You must solve captcha !

Enter the letters you see below: (a)

> a

Captcha solved!

Do you want to try your luck once again?

> NO

Main scene finished

*/

import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const captcha_scene = new Scene<BotContext, { secret: string }>("captcha")
captcha_scene.do(async (ctx) => {
	await ctx.reply(
		`You must solve captcha ${ctx.scene.arg?.again ? ` again` : ``}!`
	)
	const secret = "a"
	ctx.scene.session = { secret }
	await ctx.reply(`Enter the letters you see below: (${secret})`)
})
captcha_scene.wait().setup((scene) => {
	scene.on("message:text", async (ctx) => {
		if (ctx.message.text === ctx.scene.session.secret) {
			ctx.scene.resume()
		} else {
			await ctx.reply(`Try again!`)
		}
	})
	scene.on("message:sticker", (ctx) => ctx.reply("No stickers please."))
})
captcha_scene.do((ctx) => ctx.reply("Captcha solved!"))

const welcome_scene = new Scene("welcome")
welcome_scene.do((ctx) =>
	ctx.reply(`Welcome to ${ctx.scene.arg?.name || "scene"}`)
)

const main_scene = new Scene("main")
main_scene.call("welcome", { name: "Main Scene" })
main_scene.do((ctx) => ctx.reply("First captcha is obligatory"))
main_scene.call("captcha")
main_scene.label("captcha")
main_scene.do(async (ctx) => {
	if (Math.random() < 0.3) {
		await ctx.reply("You are lucky, no second captcha")
	} else {
		await ctx.reply("You are not lucky, you must solve second captcha")
		ctx.scene.call("captcha")
	}
})
main_scene.do(async (ctx) => {
	await ctx.reply(`Do you want to try your luck once again?`, {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "Yes", callback_data: "yes" },
					{ text: "No", callback_data: "no" },
				],
			],
		},
	})
})
main_scene.wait().on("callback_query:data", async (ctx) => {
	await ctx.answerCallbackQuery()
	if (ctx.callbackQuery.data === "yes") {
		ctx.scene.goto("captcha")
	} else {
		ctx.scene.resume()
	}
})
main_scene.do((ctx) => ctx.reply(`Main scene finished`))

create_bot([main_scene, captcha_scene, welcome_scene])
