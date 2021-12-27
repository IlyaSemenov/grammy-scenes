// Simply test types for now.

import { Scene, SceneRouter } from "grammy-scenes"

const router = new SceneRouter()

router.scene("s1").use(async (ctx) => {
	await ctx.reply(`In s1`)
})

router.scene("s2", (scene) => {
	scene.enter(async (ctx) => {
		await ctx.reply(`Entered s2`)
	})
})

const s3 = new Scene("s3")
s3.enter(async (ctx) => {
	await ctx.reply(`Entered s3`)
})

router.scene(s3)
