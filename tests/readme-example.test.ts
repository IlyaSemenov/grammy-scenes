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

mainScene.step(async (ctx) => {
	await ctx.reply("Entering main scene...")
})

mainScene.step(async (ctx) => {
	await ctx.reply("Enter your name:")
})

mainScene.wait("name").on("message:text", async (ctx) => {
	const name = ctx.message.text
	if (name.toLowerCase() === "john") {
		await ctx.reply(`Welcome, ${name}!`)
		ctx.scene.resume()
	} else {
		await ctx.reply(`${name}, your are not welcome here.`)
	}
})

create_bot([mainScene])
