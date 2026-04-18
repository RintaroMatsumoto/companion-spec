# default-persona

Reference persona for companion-spec. Consists of `manifest.json` + `persona.md`
and, at build time, a copy of the runner's current VRM as `avatar.vrm`.

To produce a `.companion` file:

```
cd examples/default-persona
cp ../../prototypes/companion-desktop/avatars/companion.vrm ./avatar.vrm
zip -r ../default.companion manifest.json persona.md avatar.vrm
```

Then load it at runtime via the MCP tool `companion_load_persona`:

```
{"bundlePath": "C:\\path\\to\\default.companion"}
```
