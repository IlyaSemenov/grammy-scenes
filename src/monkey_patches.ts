import { Composer, Context } from "grammy"

declare module "grammy" {
	interface Composer<C extends Context> {
		setup(fn: (composer: Composer<C>) => void): this
	}
}

Composer.prototype.setup = function <C extends Context>(
	this: Composer<C>,
	fn: (composer: Composer<C>) => void
) {
	fn(this)
	return this
}
