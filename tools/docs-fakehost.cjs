// node --require ./tools/docs-fakehost.cjs serve.mjs ...   makes the demo server report a made-up computer name (not this PC's).
const os = require('node:os');
os.hostname = () => 'Alex-laptop';
require('node:module').syncBuiltinESMExports();
