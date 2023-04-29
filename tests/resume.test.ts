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
	resume_token: string
}

const jobs: Job[] = []

const scene = new Scene<BotContext>("main")

scene.do(async (ctx) => {
	const resume_token = ctx.scene.createResumeToken()
	await ctx.reply(`Starting job...`)
	setTimeout(() => {
		jobs.push({ chat_id: ctx.chat!.id, resume_token })
	}, 500)
})

scene.wait().setup((scene) => {
	scene.resume(async (ctx) => {
		await ctx.reply(`Job finished: ${ctx.scene.arg}`)
		ctx.scene.resume()
	})
	scene.on("message:text", async (ctx) => {
		await ctx.reply(`Please wait until the job is done.`)
	})
})

scene.do((ctx) => ctx.reply("Enter your name"))

scene.wait().setup((scene) => {
	scene.resume(async (ctx) => {
		// This wait is not supposed to be resumed by the old token.
		await ctx.reply(`This should never happen!`)
	})
	scene.on("message:text", async (ctx) => {
		await ctx.reply(`Welcome, ${ctx.message.text}`)
		ctx.scene.resume()
	})
})

scene.do((ctx) => ctx.reply("Finished"))

create_bot([scene], (bot) => {
	setInterval(() => {
		const job = jobs.shift()
		if (job) {
			bot.handlePseudoUpdate({ chat_id: job.chat_id }, async (ctx) => {
				await ctx.scenes.resume(job.resume_token, "All OK")
			})
			// Ouch! We left a bug in the code which leads to duplicate resumes.
			// Let's see if it causes invalid bot resumes (it shouldn't, as the resume token is supposed to be invalidated).
			jobs.push(job)
		}
	}, 1000)
})
