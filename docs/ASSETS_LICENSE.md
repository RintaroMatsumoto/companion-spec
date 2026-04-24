# Third-party Asset Licenses

This file tracks the licenses of third-party binary assets bundled in the
`prototypes/companion-desktop/` tree. Source code licenses are governed by
the top-level repository `LICENSE`.

Each asset class has its own section so concurrent additions from different
branches can be merged without conflict. If you add a new asset, append a
new subsection below rather than editing an existing one.

---

## Section: VRMA motion files (`prototypes/companion-desktop/avatars/motions/*.vrma`)

### Source

- Upstream repository: <https://github.com/tk256ailab/vrm-viewer>
- Upstream commit: `main` branch (downloaded 2026-04-24)
- Upstream path: `VRMA/*.vrma`

### License

MIT License, Copyright (c) 2025 TK256. Full text mirrored from the upstream
`LICENSE` file:

```
MIT License

Copyright (c) 2025 TK256

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Files included

| File                                           | Size (bytes) | Dance clip key |
| ---------------------------------------------- | -----------: | -------------- |
| `avatars/motions/Clapping.vrma`                |      118,448 | `clap`         |
| `avatars/motions/Jump.vrma`                    |      118,448 | `jump`         |
| `avatars/motions/LookAround.vrma`              |      118,448 | `look`         |
| `avatars/motions/Thinking.vrma`                |      118,448 | `thinking`     |

The MD5 hashes of the four files above are distinct (verified 2026-04-24);
the identical byte-size is a coincidence of the upstream converter's
per-clip scaffold, not a duplicate-upload bug.

### Attribution

Add the following line (or equivalent) to any public release notes or
About dialog when shipping a build that bundles these assets:

> VRMA motions based on sample files from
> [tk256ailab/vrm-viewer](https://github.com/tk256ailab/vrm-viewer),
> licensed under the MIT License, © 2025 TK256.
