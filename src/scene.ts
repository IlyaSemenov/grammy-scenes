import { Composer, Middleware, MiddlewareFn } from "grammy"
import { SafeDictionary } from "ts-essentials"

import { SceneFlavoredContext, ScenesFlavoredContext } from "."

export class Scene<
	C extends ScenesFlavoredContext = ScenesFlavoredContext,
	S = undefined
> extends Composer<SceneFlavoredContext<C, S>> {
	steps: Array<Composer<SceneFlavoredContext<C, S>>> = []
	pos_by_label: SafeDictionary<number> = {}

	constructor(public readonly id: string) {
		super()
	}

	use(...middleware: Array<Middleware<SceneFlavoredContext<C, S>>>) {
		const composer = super.use(...middleware)
		this.steps.push(composer)
		return composer
	}

	do(mw: MiddlewareFn<SceneFlavoredContext<C, S>>) {
		this.use(async (ctx, next) => {
			await mw(ctx, async () => undefined)
			return next()
		})
	}

	wait(...middleware: Array<Middleware<SceneFlavoredContext<C, S>>>) {
		this.use((ctx) => {
			ctx.scene.wait()
		})
		return this.mustResume(...middleware)
	}

	mustResume(...middleware: Array<Middleware<SceneFlavoredContext<C, S>>>) {
		const composer = new Composer<SceneFlavoredContext<C, S>>((ctx, next) => {
			ctx.scene._must_resume = true
			return next()
		}, ...middleware)
		this.steps.push(composer)
		return composer
	}

	call(sceneId: string, arg?: any) {
		this.do((ctx) => ctx.scene.call(sceneId, arg))
	}

	label(label: string) {
		this.pos_by_label[label] = this.steps.length
	}

	middleware() {
		throw Error(`Scene is not supposed to be used directly as a middleware.`)
		return super.middleware() // Prevent type error
	}
}

export function filterResume(
	ctx: SceneFlavoredContext<ScenesFlavoredContext, any>
) {
	return ctx.scene.opts?.resume === true
}
