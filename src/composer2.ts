import { Composer, Context, MiddlewareFn } from "grammy"

/**
 * A set of generic enhancements over grammy Composer.
 *
 * These are not specific to grammy-scenes.
 *
 * Unfortunately, they never made it to the official repo.
 */
export class Composer2<C extends Context> extends Composer<C> {
	/**
	 * do() is use() which always calls next()
	 */
	do(middleware: MiddlewareFn<C>) {
		this.use(async (ctx, next) => {
			await middleware(ctx, async () => undefined)
			return next()
		})
		return this
	}

	/**
	 * Run the provided setup function against the current composer.
	 *
	 * See https://github.com/grammyjs/grammY/issues/163
	 */
	setup(setup: (composer: this) => void) {
		setup(this)
		return this
	}
}
