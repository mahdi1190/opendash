# Staged library objects (not loaded yet)

73 objects made on 7 Oct 2026 for the scene engine: city, UK coast and countryside, tropical and East Asian, and London station parts. They are NOT in src/app yet. To add them, move the files into src/app, check for id clashes with the library (e.g. vehicle.bus, tree.plane, bird.pigeon), add any new kit names to SCENE_KITS, then run node tools/anim-pack.mjs object lint.
