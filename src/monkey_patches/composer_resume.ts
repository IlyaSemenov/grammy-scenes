import { Composer, Context, Middleware } from "grammy"

import { filterResume, SceneFlavoredContext, ScenesFlavoredContext } from ".."

declare module "grammy" {
	interface Composer<C extends Context> {
		/** Register some middleware for ctx.scenes.resume() calls. */
		resume(...middleware: Middleware<C>[]): Composer<C>
	}
}

Composer.prototype.resume = function <C extends Context>(
	this: Composer<C>,
	...middleware: Middleware<C>[]
) {
	const typedThis = this as unknown as Composer<
		SceneFlavoredContext<ScenesFlavoredContext<C>, any>
	>
	return typedThis.filter(filterResume, ...middleware)
}
