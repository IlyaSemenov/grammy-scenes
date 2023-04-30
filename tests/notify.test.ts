/*

> /start

Starting job...

> Hello

Please wait until the job is done.

Job finished: All OK

Enter your name

> Peter

Welcome, Peter

Finished

*/

import { Scene } from "grammy-scenes"

import { BotContext, create_bot } from "./lib/bot"

interface Job {
	chat_id: number
	token: string
}

const jobs: Job[] = []

const scene = new Scene<BotContext>("main")

scene.step(async (ctx) => {
	const token = ctx.scene.createNotifyToken()
	await ctx.reply(`Starting job...`)
	setTimeout(() => {
		jobs.push({ chat_id: ctx.chat!.id, token })
	}, 500)
})

scene.wait().setup((scene) => {
	scene.onNotify(async (ctx) => {
		await ctx.reply(`Job finished: ${ctx.scene.arg}`)
		ctx.scene.resume()
	})
	scene.on("message:text", async (ctx) => {
		await ctx.reply(`Please wait until the job is done.`)
	})
})

scene.step((ctx) => ctx.reply("Enter your name"))

scene.wait().setup((scene) => {
	scene.onNotify(async (ctx) => {
		// This wait() is not supposed to be notified by the old token.
		await ctx.reply(`This should never happen!`)
	})
	scene.on("message:text", async (ctx) => {
		await ctx.reply(`Welcome, ${ctx.message.text}`)
		ctx.scene.resume()
	})
})

scene.step((ctx) => ctx.reply("Finished"))

create_bot([scene], (bot) => {
	setInterval(() => {
		const job = jobs.shift()
		if (job) {
			bot.handlePseudoUpdate({ chat_id: job.chat_id }, async (ctx) => {
				await ctx.scenes.notify(job.token, "All OK")
			})
			// Ouch! We left a bug in the code which leads to duplicate notify calls.
			// Let's see if it causes invalid bot resumes (it shouldn't, as the notify token is supposed to be invalidated).
			jobs.push(job)
		}
	}, 1000)
})
