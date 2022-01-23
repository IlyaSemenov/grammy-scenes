import { Composer, Context } from "grammy"

export function compose<C extends Context>(
	setup: (composer: Composer<C>) => void
) {
	const composer = new Composer<C>()
	setup(composer)
	return composer.middleware()
}
