import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePhosphorOptimize } from "phosphor-svelte/vite";
import type { InlineConfig } from "vitest/node";

export default defineConfig({
	plugins: [svelte(), sveltePhosphorOptimize()],
	resolve: {
		conditions: ["browser"]
	},
	test: {
		environment: "jsdom",
		setupFiles: ["tests/setup.ts"],
		server: {
			deps: {
				inline: [/svelte/]
			}
		}
	}
} as import("vite").UserConfig & { test: InlineConfig });
