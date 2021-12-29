// Simply test types for now.

import { Scene, SceneRouter } from "grammy-scenes"

const router = new SceneRouter()

const s1 = router.scene("s1")

s1.enter(async (ctx) => {
	await ctx.reply(`Entered s1`)
})
s1.on("message", async (ctx) => {
	await ctx.reply(`Reply from s1`)
})

router.scene("s2", (scene) => {
	scene.enter(async (ctx) => {
		await ctx.reply(`Entered s2`)
	})
	scene.on("message", async (ctx) => {
		await ctx.reply(`Reply from s2`)
	})
})

const s3 = new Scene()
s3.enter(async (ctx) => {
	await ctx.reply(`Entered s3`)
})
s3.on("message", async (ctx) => {
	await ctx.reply(`Reply from s3`)
})

router.scene("s3", s3)
