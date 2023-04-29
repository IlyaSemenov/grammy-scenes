import { Bot, Context, session, SessionFlavor } from "grammy"
import { pseudoUpdate } from "grammy-pseudo-update"
import {
	Scene,
	ScenesComposer,
	ScenesFlavoredContext,
	ScenesSessionFlavor,
} from "grammy-scenes"

export type BotContext = Context &
	SessionFlavor<ScenesSessionFlavor> &
	ScenesFlavoredContext

export async function create_bot<C extends BotContext>(
	scenes: Scene<C, any>[],
	setup?: (bot: Bot<C>) => void
) {
	const scenes_composer = new ScenesComposer<C>(...scenes)

	const is_manual_run = !!process.env.BOT_TOKEN
	const bot = new Bot<C>(process.env.BOT_TOKEN || "invalid")
	bot.use(
		session({
			type: "multi",
			scenes: {},
		})
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
	}

	return bot
}
