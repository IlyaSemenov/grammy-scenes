/*

> /start

Test passed

*/

import { Scene } from "grammy-scenes"
import { assert } from "ts-essentials"

import { BotContext, create_bot } from "./lib/bot"

const scene = new Scene<BotContext>("main")

scene.arg("foo")

scene.do(async (ctx) => {
	assert(ctx.scene.arg === "foo")
})

scene.do(async (ctx) => {
	assert(ctx.scene.arg === undefined)
	ctx.scene.next_arg = "bar"
})

scene.do(async (ctx) => {
	assert(ctx.scene.arg === "bar")
})

scene.do((ctx) => ctx.reply("Test passed"))

create_bot([scene])
