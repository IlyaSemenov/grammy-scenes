import { Composer, MiddlewareFn } from "grammy"
import { assert, Writable } from "ts-essentials"

// Hack to avoid circular import
import { Scene, ScenesManager } from "."
import { ScenesFlavoredContext } from "./types"

/** Scene (or subscene) collector that will call scene by its name */
export class SceneRouter<C extends ScenesFlavoredContext> extends Composer<C> {
	_scenes: Record<string, Scene<any>> = {}

	use_scene<C2 extends C>(scene: Scene<C2>) {
		this._scenes[scene.name] = scene
	}

	scene<C2 extends C>(name: string, setup?: (scene: Scene<C2>) => void) {
		const scene = new Scene<C2>(name)
		if (setup) {
			setup(scene)
		}
		this._scenes[name] = scene
		return scene
	}

	middleware(): MiddlewareFn<C> {
		const composer = new Composer<C>()
		composer.use(super.middleware())
		composer.lazy((ctx) => {
			if (ctx.session && ctx.session._scene) {
				const ctx2 = ctx as C & {
					_scene_path_remaining_parts?: string[]
				}
				if (!ctx2._scene_path_remaining_parts) {
					ctx2._scene_path_remaining_parts = ctx.session._scene.path.split("/")
				}
				const part = ctx2._scene_path_remaining_parts.shift()
				if (part !== undefined) {
					const middleware = this._scenes[part]
					if (middleware) {
						return middleware
					}
				}
			}
			return []
		})
		return composer.middleware()
	}

	/** Middleware that injects ctx.scenes */
	manager(): MiddlewareFn<C> {
		return (ctx, next) => {
			assert(!ctx.scenes, "ctx.scenes has already been installed.")
			const ctx2 = ctx as Writable<C>
			ctx2.scenes = new ScenesManager(ctx, this)
			return next()
		}
	}
}
