/*

> /start

Please choose:

> await scenes.enter

Scene 2, enter your name:

> John

Hello, John. This is the end, you should not see Scene 1.

> /start

Please choose:

> scenes.ente

Scene 2, enter your name:

> Peter

Hello, Peter. This is the end, you should not see Scene 1.

> /start

Please choose:

> Resume this scene

Scene 1 complete

*/

import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const scene1 = new Scene<BotContext>("main")

scene1.do(async (ctx) => {
	await ctx.reply(`Please choose:`, {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "await scenes.enter", callback_data: "scenes_enter" },
					{ text: "scene.enter", callback_data: "scene_enter" },
				],
				[{ text: "Resume this scene", callback_data: "resume" }],
			],
		},
	})
})

scene1.wait().on("callback_query:data", async (ctx) => {
	await ctx.answerCallbackQuery()
	if (ctx.callbackQuery.data === "scenes_enter") {
		await ctx.scenes.enter("scene2")
	} else if (ctx.callbackQuery.data === "scene_enter") {
		ctx.scene.enter("scene2")
	} else if (ctx.callbackQuery.data === "resume") {
		ctx.scene.resume()
	}
})

scene1.do((ctx) => ctx.reply(`Scene 1 complete`))

const scene2 = new Scene<BotContext>("scene2")

scene2.do((ctx) => ctx.reply(`Scene 2, enter your name:`))
scene2.wait().on("message:text", async (ctx) => {
	await ctx.reply(
		`Hello, ${ctx.message.text}. This is the end, you should not see Scene 1.`
	)
	ctx.scene.resume()
})

create_bot([scene1, scene2])
