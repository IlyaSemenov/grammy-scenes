import { Scene } from "grammy-scenes"
import { assert } from "ts-essentials"

import { BotContext, create_bot } from "./lib/bot"

const scene = new Scene<BotContext & { foo: string }, string>("main")

scene.do((ctx) => {
	ctx.scene.session = "foo"
})

scene.always().do((ctx) => {
	// TODO: make this assert work?
	// assert(ctx.scene.session)
	ctx.foo = ctx.scene.session
})

scene.do(async (ctx) => {
	assert(ctx.foo === "foo")
	await ctx.reply("Send me something.")
})

scene.wait().on("message", async (ctx) => {
	assert(ctx.foo === "foo")
	console.log("All OK!")
	ctx.scene.resume()
})

create_bot([scene])
