import { MiddlewareFn } from "grammy"

import { SceneFlavoredContext, ScenesFlavoredContext } from "."
import { Composer2 } from "./composer2"

export class StepComposer<
	C extends ScenesFlavoredContext = ScenesFlavoredContext,
	S = undefined
> extends Composer2<SceneFlavoredContext<C, S>> {
	/** Set payload for ctx.scene.arg in next step */
	arg(arg: any) {
		return this.do((ctx) => {
			ctx.scene.next_arg = arg
		})
	}

	/** Call nested scene, then go to the next step. */
	call(sceneId: string, arg?: any) {
		this.use((ctx) => ctx.scene.call(sceneId, arg))
	}

	/** Exit scene. */
	exit(arg?: any) {
		this.use((ctx) => ctx.scene.exit(arg))
	}

	/** Go to scene step marked with scene.label() */
	goto(label: string, arg?: any) {
		this.use((ctx) => ctx.scene.goto(label, arg))
	}

	/** Register middleware for ctx.scenes.notify() calls. */
	onNotify(...middleware: Array<MiddlewareFn<SceneFlavoredContext<C, S>>>) {
		return this.filter((ctx) => ctx.scene?._notify === true, ...middleware)
	}
}
