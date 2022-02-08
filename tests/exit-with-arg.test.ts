import { Scene } from "grammy-scenes"
import { assert } from "ts-essentials"

import { BotContext, create_bot } from "./lib/bot"

const scene = new Scene<BotContext>("main")

scene.call("inner", 10)

scene.do(async (ctx) => {
	assert(ctx.scene.arg === 20)
	await ctx.reply("All OK!")
})

const inner = new Scene<BotContext>("inner")

inner.do(async (ctx) => {
	assert(ctx.scene.arg === 10)
	ctx.scene.exit(20)
})

create_bot([scene, inner])
