import { Bot, session } from "grammy"
import { pseudoUpdate } from "grammy-pseudo-update"
import { Scene, ScenesComposer, ScenesFlavoredContext } from "grammy-scenes"

export function create_bot<C extends ScenesFlavoredContext>(
	...scenes: Scene<C, any>[]
) {
	const scenes_composer = new ScenesComposer<C>(...scenes)

	const is_test = !!process.env.BOT_TOKEN
	const bot = new Bot<C>(process.env.BOT_TOKEN || "invalid")
	bot.use(session({ initial: () => ({}) }))
	if (!is_test) {
		bot.use(async (ctx, next) => {
			await next()
			console.log(`Saving session: ${JSON.stringify(ctx.session)}`)
		})
	}
	bot.use(scenes_composer.manager())
	bot.use(pseudoUpdate)
	bot.command("start", (ctx) => ctx.scenes.enter("main"))
	bot.use(scenes_composer)
	return bot
}
