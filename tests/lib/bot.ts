import { Bot, Context, lazySession, LazySessionFlavor } from "grammy"
import { pseudoUpdate } from "grammy-pseudo-update"
import {
	Scene,
	ScenesComposer,
	ScenesFlavor,
	ScenesSessionData,
} from "grammy-scenes"

export type BotContext = Context &
	LazySessionFlavor<ScenesSessionData> &
	ScenesFlavor

export async function create_bot<C extends BotContext>(
	scenes: Scene<C, any>[],
	setup?: (bot: Bot<C>) => void
) {
	const scenes_composer = new ScenesComposer<C>(...scenes)

	const token = import.meta.env.BOT_TOKEN
	const is_manual_run = !!token
	const bot = new Bot<C>(token || "invalid")
	bot.use(
		lazySession({
			initial: () => ({}),
		})
		// session({
		// 	type: "multi",
		// 	scenes: {},
		// })
	)
	if (is_manual_run) {
		bot.use(async (ctx, next) => {
			await next()
			console.log(`Saving session: ${JSON.stringify(ctx.session)}`)
		})
	}
	bot.use(scenes_composer.manager())
	bot.use(pseudoUpdate)
	bot.command("start", (ctx) => ctx.scenes.enter("main"))
	bot.use(scenes_composer)

	if (is_manual_run) {
		setup?.(bot)
		await bot.init()
		console.log(`Bot @${bot.botInfo.username} started.`)
		bot.start()
		if (import.meta.hot) {
			import.meta.hot.on("vite:beforeFullReload", async () => {
				await bot.stop()
			})
		}
	}

	return bot
}
