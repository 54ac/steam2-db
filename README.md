# Steam2 Browser

### What is this?

This is a metadata browser for the leaked Steam2 blobs/dats. In-depth description coming soon.

### Disclaimer

This website does not host any copyrighted data of any kind. I do not intend for this tool to be used for commercial purposes and do not benefit from it financially in any way.

### Where can I find this?

Should be deployed to **[https://steam2-db.pages.dev/](https://steam2-db.pages.dev/)** unless something horrible has happened.

### How do I run this locally?

Install **Node v26** and **pnpm v12**, assemble database and copy to `public` folder (tools coming soon), run `pnpm i` and `pnpm dev`, then open [http://localhost:3001](http://localhost:3001).

### Changelog

- v1.0.0:
  - Initial release (made in React in a few hours with Gemini Flash)
  - Depot/app metadata pipeline -> browser + search + filelist in depot view
- v2.0.0:
  - Refactored as much as possible
  - Database cleanup
  - Added manifest diff, developer metadata, wildcard search, global file search
- v3.0.0:
  - Rewritten in Svelte so I can't notice the bad code as clearly because I'm not very proficient in it
  - More database cleanup
  - Added extractor command generator, multi-app depot support

### TODO

- Fix bugs
- More refactoring
- Add tests!!!
- Add database pipeline tools
- Update readme with proper description
