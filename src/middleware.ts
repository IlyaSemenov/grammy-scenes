import { MiddlewareFn } from "grammy"
import { Writable } from "ts-essentials"

import { ScenesManager } from "./manager"
import { SceneRouter } from "./router"
import { ScenesFlavoredContext } from "./types"

/** Middleware that injects ctx.scenes */
export function scenes_control_middleware<C extends ScenesFlavoredContext>(
	scenes: SceneRouter<C>
): MiddlewareFn<C> {
	return (ctx, next) => {
		const ctx2 = ctx as Writable<C>
		ctx2.scenes = new ScenesManager(ctx, scenes)
		return next()
	}
}
