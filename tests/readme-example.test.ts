// This test repeats the introduction example from README.md

import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const mainScene = new Scene<BotContext>("main")

// Scene extends Composer, so you may use all methods such as .use() .on() etc.
mainScene.use((ctx, next) => {
	console.log("Entering main scene...")
	return next()
})

// Simply put, do() is a use() which automatically calls next()
mainScene.do(async (ctx) => {
	await ctx.reply(`Enter your name:`)
})

// As the flow comes to wait() middleware, the execution will stop and next Telegram updates will be passed to the inner middleware.
// The inner middleware should call ctx.scene.resume() to proceed to the next scene step.
mainScene.wait().on("message:text", async (ctx) => {
	const name = ctx.message.text
	if (name.toLowerCase() === "john") {
		await ctx.reply(`Welcome, ${name}!`)
		// Proceed to the next step.
		ctx.scene.resume()
	} else {
		// Keep the execution in the current wait() block.
		await ctx.reply(`${name}, your are not welcome here.`)
	}
})

create_bot([mainScene])
