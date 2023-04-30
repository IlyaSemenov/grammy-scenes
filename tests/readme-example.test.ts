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

// Define scene flow with steps.
mainScene.step(async (ctx) => {
	await ctx.reply("Entering main scene...")
})

mainScene.step(async (ctx) => {
	await ctx.reply("Enter your name:")
})

// As the flow comes to wait(), the execution will stop.
// Next Telegram updates will be passed to the inner middleware.
// The inner middleware should call ctx.scene.resume() to proceed to the next scene step.
// Make sure to use unique name in each wait() block.
mainScene.wait("name").on("message:text", async (ctx) => {
	const name = ctx.message.text
	if (name.toLowerCase() === "john") {
		await ctx.reply(`Welcome, ${name}!`)
		// Proceed to the next step.
		ctx.scene.resume()
	} else {
		await ctx.reply(`${name}, your are not welcome here.`)
		// Keep the execution in the current wait() block.
	}
})

create_bot([mainScene])
