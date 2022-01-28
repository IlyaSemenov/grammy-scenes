import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const scene1 = new Scene<BotContext>("main")

scene1.do(async (ctx) => {
	await ctx.reply(`Please choose:`, {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "Enter scene2", callback_data: "enter" },
					{ text: "Continue", callback_data: "continue" },
				],
			],
		},
	})
})

scene1.wait().on("callback_query:data", async (ctx) => {
	await ctx.answerCallbackQuery()
	if (ctx.callbackQuery.data === "enter") {
		await ctx.scenes.enter("scene2")
	} else if (ctx.callbackQuery.data === "continue") {
		ctx.scene.resume()
	}
})

scene1.do((ctx) => ctx.reply(`Scene 1 complete`))

const scene2 = new Scene<BotContext>("scene2")

scene2.do((ctx) => ctx.reply(`Scene 2, enter your name:`))
scene2.wait().on("message:text", async (ctx) => {
	await ctx.reply(`Hello, ${ctx.message.text}`)
	ctx.scene.resume()
})

create_bot([scene1, scene2])
