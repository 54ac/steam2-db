import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePhosphorOptimize } from "phosphor-svelte/vite";
export default defineConfig({
	define: {
		__BUILD_HASH__: JSON.stringify(Date.now().toString(36))
	},
	plugins: [svelte(), sveltePhosphorOptimize()],
	server: {
		port: 3001
	},
	worker: {
		format: "es"
	},
	build: {
		target: "esnext",
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules/bits-ui")) {
						return "vendor-bits-ui";
					}
					return undefined;
				}
			}
		}
	}
});
