// Shard 4 of 5 of the region workflow tests (tests/anim-pack-cli.shared.mjs says why they are sharded): runs in its own process.
process.env.ANIM_CLI_SHARD = '3';
await import('./anim-pack-cli.shared.mjs');
