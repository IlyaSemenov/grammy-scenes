import { MiddlewareFn, MiddlewareObj } from "grammy"
import { assert, SafeDictionary } from "ts-essentials"

import { Scene, ScenesFlavoredContext, ScenesManager } from "."

/**
 * Top-level collection of scenes.
 */
export class ScenesComposer<C extends ScenesFlavoredContext>
	implements MiddlewareObj<C>
{
	scenes: SafeDictionary<Scene<C, any>> = {}

	constructor(...scenes: Scene<C, any>[]) {
		for (const scene of scenes) {
			this.scene(scene)
		}
	}

	scene(scene: Scene<C, any>) {
		assert(!this.scenes[scene.id], `Scene ${scene.id} already registered.`)
		this.scenes[scene.id] = scene
	}

	manager(): MiddlewareFn<C> {
		const mw: MiddlewareFn<C> = (ctx, next) => {
			const writable_ctx = ctx as any
			writable_ctx.scenes = new ScenesManager<C>(ctx, this)
			return next()
		}
		return mw
	}

	middleware() {
		const mw: MiddlewareFn<C> = async (ctx, next) => {
			const session = await ctx.session
			const stack = session.scenes?.stack
			if (stack) {
				await ctx.scenes._run_stack(stack)
			} else {
				return next()
			}
		}
		return mw
	}
}
