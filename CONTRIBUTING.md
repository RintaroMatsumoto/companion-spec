# Contributing to companion-spec

Thanks for your interest. This project is in the earliest design phase, which means contributions are most valuable at the level of **ideas and specification**, not yet code.

## What is most useful right now

- **Review of [`DESIGN.md`](DESIGN.md)** — poke holes in the six-layer model, question the bundle format, propose alternatives
- **Runtime adapter research** — what does it actually take to load an external bundle into Unity for Quest? Into a WebXR scene? Into Godot?
- **Avatar format debate** — VRM is the current default, but should we be format-agnostic and ship a converter layer?
- **Ethics policy** — the companion/relationship boundary needs careful drafting; real experience from HCI, psychology, or AI safety is welcome

## What is not yet useful

- Pull requests adding skills to `skills/`. The design is not stable enough to absorb them.
- Voice model integrations. Placeholder for v0.1+.
- VR/AR runtime implementations. Placeholder for v0.2+.

## How to propose changes

1. Open an issue first. Describe the change, the motivation, and any breaking implications.
2. Wait for discussion before opening a PR.
3. For discussion-only contributions (design ideas, research pointers), issues alone are welcome. No PR needed.

## Tone and style

- English for code, spec, and README.
- Japanese or English for issues and design discussion both welcome.
- No emoji in source files.
- Be direct, be specific, assume the reader is capable.

## License

By contributing you agree that your contribution is licensed under the MIT License of this repository.
