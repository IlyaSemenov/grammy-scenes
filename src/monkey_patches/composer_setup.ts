import { Composer, Context } from "grammy"

declare module "grammy" {
	interface Composer<C extends Context> {
		/**
		 * Run the provided setup function against the current composer.
		 *
		 * See https://github.com/grammyjs/grammY/issues/163
		 * */
		setup(setup: (composer: Composer<C>) => void): this
	}
}

Composer.prototype.setup = function <C extends Context>(
	this: Composer<C>,
	setup: (composer: Composer<C>) => void
) {
	setup(this)
	return this
}
