import { Composer, Context, MiddlewareFn } from "grammy"

declare module "grammy" {
	interface Composer<C extends Context> {
		/** Simply put, do() is a use() which automatically calls next() */
		do(middleware: MiddlewareFn<C>): void
	}
}

Composer.prototype.do = function <C extends Context>(
	this: Composer<C>,
	middleware: MiddlewareFn<C>
) {
	this.use(async (ctx, next) => {
		await middleware(ctx, async () => undefined)
		return next()
	})
}
