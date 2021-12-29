import { assert } from "ts-essentials"
import { v4 as uuid_v4 } from "uuid"

import { SceneRouter } from "./router"
import { ScenesFlavoredContext } from "./types"

/** injected as ctx.scenes */
export class ScenesManager {
	constructor(
		private _ctx: ScenesFlavoredContext,
		private _scenes: SceneRouter<any>
	) {}

	async enter(scene_name: string, arg?: any) {
		const ctx = this._ctx
		const scene = this._scenes._scenes[scene_name]
		assert(scene, `Scene ${scene_name} not found.`)
		ctx.session._scene = { path: scene_name }
		await scene._enter_handler?.(ctx, arg)
	}

	async inner(scene_name: string, arg?: any) {
		const active_scene = this._ctx.session._scene
		assert(active_scene, `No active scene.`)
		await this._enter_inner(`${active_scene.path}/${scene_name}`, arg)
	}

	async move(scene_name: string, arg?: any) {
		const active_scene = this._ctx.session._scene
		assert(active_scene, `No active scene.`)
		await this._enter_inner(
			active_scene.path.replace(/[^\/]+$/, scene_name),
			arg
		)
	}

	leave() {
		this._ctx.session._scene = undefined
	}

	async _enter_inner(path: string, arg?: any) {
		const scene = this._get_scene_by_path(path)
		Object.assign(this._ctx.session._scene, {
			path,
			token: undefined,
		})
		await scene._enter_handler?.(this._ctx, arg)
	}

	_get_scene_by_path(path: string) {
		let router = this._scenes
		let scene = undefined
		for (const part of path.split("/")) {
			scene = router = router._scenes[part]
		}
		assert(scene, `Scene ${path} not found.`)
		return scene
	}

	createContinueToken() {
		const current_scene = this._ctx.session._scene
		assert(current_scene, `No active scene.`)
		current_scene.continue_token = uuid_v4()
		return current_scene.continue_token
	}

	async continue(token: string, arg?: any) {
		if (this._ctx.session._scene?.continue_token === token) {
			const scene = this._get_scene_by_path(this._ctx.session._scene.path)
			assert(scene._continue_handler, `Scene doesn't have continue handler.`)
			await scene._continue_handler(this._ctx, arg)
		}
	}
}
