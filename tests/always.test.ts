/*

> /start

Context correct: true. Now send me something.

> test

Context correct: true

*/

import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

const scene = new Scene<BotContext & { foo: string }>("main")

const important_value = "important"

scene.always().do((ctx) => {
	ctx.foo = important_value
})

scene.step(async (ctx) => {
	await ctx.reply(
		`Context correct: ${ctx.foo === important_value}. Now send me something.`
	)
})

scene.wait("something").on("message", async (ctx) => {
	await ctx.reply(`Context correct: ${ctx.foo === important_value}`)
	ctx.scene.resume()
})

create_bot([scene])
