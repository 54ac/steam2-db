# Steam2 Browser

### What is this?

This is a metadata browser for the leaked Steam2 blobs/dats. Initially a mostly AI-generated React app with a Node blob->database pipeline to get it done ASAP. Frontend now rewritten in Svelte to increase my familiarity with it. I'm not planning on touching the database/search portions in fear of breaking it but PRs are welcome if anyone feels like it, as I'm sure none of this is particularly optimal.

#### Flow

The metadata database was created using an amalgam of data from the blobs, the [steam2-winfsp csv](https://github.com/dr3murr/steam2-winfsp/blob/main/data/depot_labels.tsv), appinfo.vdf, PICS, and Wikidata. The filelist search database was created using trigrams, whatever that means. The frontend interfaces with the search database using Cloudflare Functions.

### Disclaimer

This website does not host any copyrighted data of any kind. I do not intend for this tool to be used for commercial purposes and do not benefit from it financially in any way.

### Where can I find this?

Should be deployed to **[https://steam2-db.pages.dev/](https://steam2-db.pages.dev/)** unless something horrible has happened. **[https://stg.steam2-db.pages.dev/](https://stg.steam2-db.pages.dev/)** if you want to check out the latest features if there are any.

### How do I run this locally?

Install **Node v26** and **pnpm v12**, clone the repo using `git clone https://github.com/54ac/steam2-db`, run `pnpm i` and `pnpm dev`, then open **[http://localhost:3001](http://localhost:3001)**. Cloudflare Functions won't work, so the filelist search will fall back to processing the trigram database locally.

### Changelog

- v1.0.0:
  - Initial release
  - Depot/app metadata pipeline -> browser + search + filelist in depot view
- v2.0.0:
  - Refactored as much as possible
  - Database cleanup
  - Added manifest diff, developer metadata, wildcard search, global file search
- v3.0.0:
  - Rewritten in Svelte
  - More database cleanup
  - Added extractor command generator, multi-app depot support
- v3.1.0:
  - Add new blob metadata based on steam2-winfsp repo and update depot csv
  - Styling cleanup

### TODO

- Fix bugs
- More refactoring
- Add tests!!!
- Add database pipeline tools
- Update readme with proper description
