import { v4 as uuid_v4 } from "uuid"

import { SceneRunOpts, ScenesFlavoredContext, SceneStackFrame } from "."

/** injected as ctx.scene */
export class SceneManager<S = unknown> {
	constructor(
		public readonly frame: SceneStackFrame,
		public readonly opts?: SceneRunOpts
	) {}

	/** Return session data that is local to this scene. The data will be discarded once scene completes, and persisted during nested scene calls. */
	get session() {
		return this.frame.context as S
	}

	set session(value: S) {
		this.frame.context = value
	}

	/** Return optional payload passed to enter(), call(), resume(), goto(), set by arg() or next_arg */
	get arg() {
		return this.opts?.arg
	}

	/** Payload for ctx.scene.arg in next step */
	next_arg: any = undefined

	/** Break scene middleware flow, wait for new updates. */
	wait() {
		this._want_wait = true
	}
	_want_wait = false

	/** This middleware must call ctx.scene.resume() to go to the next middleware. */
	mustResume() {
		this._must_resume = true
	}
	_must_resume = false

	/** Go to the next middleware after this one completes. Used after ctx.scenes.wait() or ctx.scene.mustResume() */
	resume() {
		this._want_resume = true
	}
	_want_resume = false

	/** Go to scene step marked with scene.label() */
	goto(label: string, arg?: any) {
		this._want_goto = { label, arg }
	}
	_want_goto?: { label: string; arg?: any }

	/**
	 * Exit scene.
	 *
	 * Nested scene will return to outer scene, optionally with argument.
	 * */
	exit(arg?: any) {
		this._want_exit = { arg }
	}
	_want_exit?: { arg?: any }

	/** Call nested scene, then go to the next step. */
	call(sceneId: string, arg?: any) {
		this._want_call = { scene_id: sceneId, arg }
	}
	_want_call?: { scene_id: string; arg?: any }

	/** Disregard current scenes stack, switch to a new scene. */
	enter(sceneId: string, arg?: any) {
		this._want_enter = { scene_id: sceneId, arg }
	}
	_want_enter?: { scene_id: string; arg?: any }

	/** Return a token that can be used later for ctx.scenes.resume() */
	createResumeToken() {
		const token = uuid_v4()
		this.frame.token = token
		return token
	}
}

export type SceneFlavoredContext<C extends ScenesFlavoredContext, S> = C & {
	readonly scene: SceneManager<S>
}
