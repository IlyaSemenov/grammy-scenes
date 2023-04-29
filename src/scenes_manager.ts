import { Composer } from "grammy"
import { assert, SafeDictionary } from "ts-essentials"

import {
	Scene,
	SceneFlavoredContext,
	SceneManager,
	ScenesFlavoredContext,
	SceneStackFrame,
} from "."

/** injected as ctx.scenes */
export class ScenesManager<
	// This is a public type, so we provide defaults.
	C extends ScenesFlavoredContext = ScenesFlavoredContext
> {
	constructor(
		public readonly ctx: C,
		public readonly scenes: SafeDictionary<Scene<C, any>>
	) {}

	/** Enter top-level scene */
	async enter(sceneId: string, arg?: unknown) {
		const scene = this.scenes[sceneId]
		assert(scene, `Scene ${sceneId} not found.`)
		await this._run_stack([{ scene: sceneId, pos: 0 }], { arg })
	}

	/** Abort scenes execution */
	async abort() {
		this.ctx.session.scenes = undefined
	}

	/** Resume scene if it's still on the same step */
	async resume(token: string, arg?: unknown) {
		const stack = this.ctx.session.scenes?.stack
		if (stack && token && stack[0]?.token === token) {
			await this._run_stack(stack, { arg, resume: true })
		}
	}

	async _run_stack(stack: SceneStackFrame[], opts?: SceneRunOpts) {
		// By default, delete the stack from the session.
		// Re-save it explicitly if ctx.scene._wait() was called.
		this.ctx.session.scenes = undefined

		while (stack[0]) {
			const frame = stack[0]
			const scene = this.scenes[frame.scene]
			if (!scene) {
				// Invalid session data - abort.
				return
			}
			const step = scene._steps[frame.pos]
			// TODO: distinguish case where missing step is caused by invalid session data vs. normal scene finish.
			if (step) {
				let finished: boolean
				const composer = new Composer<SceneFlavoredContext<C, any>>()
				if (scene._always) {
					// TODO: don't run _always middleware for the next step of the same scene
					composer.use(scene._always)
				}
				composer.use(step)
				const handler = composer.middleware()
				const inner_ctx = this.ctx as any
				const scene_manager = new SceneManager(frame, opts)
				opts = undefined
				inner_ctx.scene = scene_manager
				try {
					finished = false
					await handler(inner_ctx, async () => {
						finished = true
					})
				} finally {
					delete inner_ctx.scene
				}

				if (scene_manager._want_enter) {
					// Replace stack with new scene.
					const { scene_id, arg } = scene_manager._want_enter
					stack = [{ scene: scene_id, pos: 0 }]
					opts = { arg }
					continue
				} else if (scene_manager._want_exit) {
					// Exit current scene.
					const { arg } = scene_manager._want_exit
					opts = { arg }
					// Do nothing - this will shift stack and continue to outer scene.
				} else if (scene_manager._want_goto) {
					// Goto step inside current scene
					const { label, arg } = scene_manager._want_goto
					const pos = scene._pos_by_label[label]
					assert(
						pos !== undefined,
						`Scene ${scene.id} doesn't have label ${label}.`
					)
					frame.pos = pos
					opts = { arg }
					continue
				} else if (scene_manager._want_call) {
					// FIXME: need to save named position here.
					const { scene_id, arg } = scene_manager._want_call
					frame.pos++
					stack.unshift({ scene: scene_id, pos: 0 })
					opts = { arg }
					continue
				} else if (scene_manager._want_must_resume) {
					if (scene_manager._want_resume) {
						delete frame.token
						frame.pos++
						continue
					} else {
						// ctx.scene.resume() was not called - save session and abort.
						// FIXME: need to save named position here.
						this.ctx.session.scenes ??= { stack }
						return
					}
				} else if (scene_manager._want_wait) {
					// FIXME: need to save named position here.
					frame.pos++
					this.ctx.session.scenes ??= { stack }
					return
				} else if (finished) {
					// Middleware called next(), thus proceed to next step.
					frame.pos++
					opts = { arg: scene_manager.next_arg }
					continue
				} else {
					// Middleware didn't call next() and didn't ask to wait; stop execution.
					return
				}
			}
			stack.shift()
		}
	}
}

export interface SceneRunOpts {
	arg?: any
	resume?: boolean
}
