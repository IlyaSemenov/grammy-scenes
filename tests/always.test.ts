/*

> /start

Send me something.

> anything

Context data is "important" (should be "important")

*/

import { Scene } from "grammy-scenes"
import { assert } from "ts-essentials"

import { BotContext, create_bot } from "./lib/bot"

const scene = new Scene<BotContext & { foo: string }, string>("main")

const important_value = "important"

scene.do((ctx) => {
	ctx.scene.session = important_value
})

scene.always().do((ctx) => {
	// TODO: make this assert work?
	// assert(ctx.scene.session)
	ctx.foo = ctx.scene.session
})

scene.do(async (ctx) => {
	assert(ctx.foo === important_value)
	await ctx.reply("Send me something.")
})

scene.wait().on("message", async (ctx) => {
	await ctx.reply(
		`Context data is "${ctx.foo}" (should be "${important_value}")`
	)
	ctx.scene.resume()
})

create_bot([scene])
