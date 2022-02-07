import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const scene = new Scene<BotContext>("main")

scene.do(async (ctx) => {
	await ctx.reply(`Proceed or Exit?`, {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "Proceed", callback_data: "proceed" },
					{ text: "Exit", callback_data: "exit" },
				],
			],
		},
	})
})

scene.wait().on("callback_query:data", async (ctx) => {
	await ctx.answerCallbackQuery()
	if (ctx.callbackQuery.data === "proceed") {
		ctx.scene.resume()
	} else if (ctx.callbackQuery.data === "exit") {
		ctx.scene.exit()
	}
})

scene.do(async (ctx) => {
	await ctx.reply(`Step 1`)
})
scene.do(async (ctx) => {
	await ctx.reply(`Step 2`)
	ctx.scene.exit()
})
scene.do(async (ctx) => {
	await ctx.reply(`Step 3 (should not see this)`)
})

create_bot([scene])
