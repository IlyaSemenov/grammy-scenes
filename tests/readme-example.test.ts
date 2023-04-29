/*

> /start

Enter your name:

> hacker

hacker, your are not welcome here.

> john

Welcome, john!

*/

import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const mainScene = new Scene<BotContext>("main")

// Define scene flow with middlewares.
// Make sure you call next() or the scene will stop.
mainScene.use(async (ctx, next) => {
	await ctx.reply("Entering main scene...")
	return next()
})

// do() is a shortcut for use() which automatically calls next()
mainScene.do(async (ctx) => {
	await ctx.reply("Enter your name:")
})

// As the flow comes to wait(), the execution will stop.
// Next Telegram updates will be passed to the inner middleware.
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
