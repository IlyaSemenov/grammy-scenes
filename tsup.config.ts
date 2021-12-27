import { defineConfig } from "tsup"

export default defineConfig({
	clean: true,
	entry: ["src/index.ts", "src/contrib/pseudo-update.ts"],
	format: ["cjs", "esm"],
	sourcemap: true,
	dts: true,
})
