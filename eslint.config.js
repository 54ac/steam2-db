import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import sonarjs from "eslint-plugin-sonarjs";
import prettierConfig from "eslint-config-prettier";
import svelteParser from "svelte-eslint-parser";

export default tseslint.config(
	{ ignores: ["dist", "node_modules", "public"] },
	sonarjs.configs.recommended,
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs["flat/recommended"],
	...svelte.configs["flat/prettier"],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.worker
			}
		}
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			"@typescript-eslint/no-deprecated": "warn"
		}
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser
			}
		},
		rules: {
			"sonarjs/no-use-of-empty-return-value": "off"
		}
	},
	{
		rules: {
			"sonarjs/deprecation": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
			],
			"no-unused-vars": "off",
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"no-unused-expressions": [
				"error",
				{
					allowShortCircuit: true,
					allowTernary: true
				}
			],
			eqeqeq: ["error", "always"],
			curly: ["error", "all"]
		}
	},
	prettierConfig
);
