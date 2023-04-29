import { Middleware, MiddlewareFn } from "grammy"
import { SafeDictionary } from "ts-essentials"

import { SceneFlavoredContext, ScenesFlavoredContext } from "."
import { Composer2 } from "./composer2"
import { StepComposer } from "./step"

export class Scene<
	C extends ScenesFlavoredContext = ScenesFlavoredContext,
	S = undefined
> {
	_always?: Composer2<SceneFlavoredContext<C, S>>
	_steps: Array<StepComposer<SceneFlavoredContext<C, S>, S>> = []
	_pos_by_label: SafeDictionary<number> = {}

	constructor(public readonly id: string) {}

	always(...middleware: Array<Middleware<SceneFlavoredContext<C, S>>>) {
		this._always ??= new Composer2<SceneFlavoredContext<C, S>>()
		this._always.use(...middleware)
		return this._always
	}

	/**
	 * Add a scene step.
	 */
	use(...middleware: Array<MiddlewareFn<SceneFlavoredContext<C, S>>>) {
		const step = new StepComposer<SceneFlavoredContext<C, S>, S>(...middleware)
		this._steps.push(step)
		return step
	}

	/**
	 * Add a scene step which will always call the next step (unless explicitly aborted).
	 */
	do(middleware: MiddlewareFn<SceneFlavoredContext<C, S>>) {
		return this.use().do(middleware)
	}

	/**
	 * Mark a named position in scene to be used by scene.goto()
	 */
	label(label: string) {
		if (label in this._pos_by_label) {
			throw new Error(`Scene ${this.id} already has step ${label}.`)
		}
		this._pos_by_label[label] = this._steps.length
		return this
	}

	/**
	 * Break scene middleware flow.
	 * Wait for new updates and pass them to the nested middleware.
	 *
	 * @example
	 * ```ts
	 * scene.wait().on("message:text", async (ctx) => {
	 *   await ctx.reply("...")
	 *   if (...) {
	 *     ctx.scene.resume()
	 *   }
	 * })
	 * ```
	 */
	wait() {
		this.use((ctx) => {
			ctx.scene._wait()
		})
		return this.do((ctx) => {
			ctx.scene._must_resume()
		})
	}

	/** Set payload for ctx.scene.arg in next step */
	arg(arg: any) {
		return this.use().arg(arg)
	}

	/** Call nested scene, then go to the next step. */
	call(sceneId: string, arg?: any) {
		this.use().call(sceneId, arg)
	}

	/** Exit scene. */
	exit(arg?: any) {
		this.use().exit(arg)
	}

	/** Go to named step. */
	goto(name: string, arg?: any) {
		this.use().goto(name, arg)
	}
}
