import { defineConfig } from "vite"
import tsconfig_paths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [tsconfig_paths()],
	envPrefix: "BOT_",
})
