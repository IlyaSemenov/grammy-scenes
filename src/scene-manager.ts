import * as uuid from "uuid"

import { ScenesFlavoredContext } from "."

/** injected as ctx.scene */
export class SceneManager<S = unknown> {
	session: S
	readonly arg?: any
	readonly _notify?: boolean

	constructor({
		session,
		arg,
		_notify,
	}: {
		session: S
		arg?: any
		_notify?: boolean
	}) {
		this.session = session as S
		this.arg = arg
		this._notify = _notify
	}

	/** Payload for ctx.scene.arg in next step */
	next_arg: any = undefined

	/** Break scene flow, wait for new updates. */
	_wait() {
		this._want_wait = true
	}
	_want_wait = false

	/** This middleware must call ctx.scene.resume() to go to the next middleware. */
	_must_resume() {
		this._want_must_resume = true
	}
	_want_must_resume = false

	/** Go to the next middleware after this one completes. Used to proceed after wait() */
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

	/** Return a token that can be used later for ctx.scenes.notify() */
	createNotifyToken() {
		return (this._notify_token = uuid.v4())
	}
	_notify_token?: string
}

export type SceneFlavoredContext<C extends ScenesFlavoredContext, S> = C & {
	readonly scene: SceneManager<S>
}
