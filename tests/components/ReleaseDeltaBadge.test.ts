import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import ReleaseDeltaBadge from "../../src/components/CatalogTable/ReleaseDeltaBadge.svelte";

describe("ReleaseDeltaBadge component", () => {
	it("renders dash for missing dates", () => {
		const { container } = render(ReleaseDeltaBadge, {
			props: { buildDate: undefined, releaseDate: undefined }
		});
		const badge = container.querySelector(".delta-badge");
		expect(badge?.textContent?.trim()).toBe("—");
		expect(badge?.classList.contains("variant-none")).toBe(true);
	});

	it("renders pre-release delta with variant-pre class", () => {
		const { container } = render(ReleaseDeltaBadge, {
			props: {
				buildDate: "2004-10-01",
				releaseDate: "2004-11-16"
			}
		});
		const badge = container.querySelector(".delta-badge");
		expect(badge?.textContent?.trim()).toBe("-46d");
		expect(badge?.classList.contains("variant-pre")).toBe(true);
		expect(badge?.getAttribute("title")).toContain("46 days before release");
	});

	it("renders post-release delta with variant-post class", () => {
		const { container } = render(ReleaseDeltaBadge, {
			props: {
				buildDate: "2004-12-01",
				releaseDate: "2004-11-16"
			}
		});
		const badge = container.querySelector(".delta-badge");
		expect(badge?.textContent?.trim()).toBe("+15d");
		expect(badge?.classList.contains("variant-post")).toBe(true);
		expect(badge?.getAttribute("title")).toContain("15 days after release");
	});

	it("renders 0d for same-day release", () => {
		const { container } = render(ReleaseDeltaBadge, {
			props: {
				buildDate: "2004-11-16",
				releaseDate: "2004-11-16"
			}
		});
		const badge = container.querySelector(".delta-badge");
		expect(badge?.textContent?.trim()).toBe("0d");
		expect(badge?.getAttribute("title")).toContain(
			"Build date matches release date"
		);
	});
});
