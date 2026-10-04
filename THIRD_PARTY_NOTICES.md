# Third-party notices

OpenDash is MIT licensed (see `LICENSE`) and has no npm dependencies. It ships
three third-party components, vendored in `vendor/` and built into the single
`index.html`. Each keeps its own licence; the full texts are next to the files.

| Component | Version | Used for | Licence (SPDX) | Full text |
|---|---|---|---|---|
| Apache ECharts | 5.6.1 | Charts in Finances | Apache License 2.0 (`Apache-2.0`) | `vendor/echarts.LICENSE`, `vendor/echarts.NOTICE` |
| Inter (rsms/inter), variable, Latin subset | 4.x | The interface font; the letterforms of the OpenDash wordmark | SIL Open Font License 1.1 (`OFL-1.1`) | `vendor/fonts/Inter-OFL.txt` |
| Lucide icons (lucide-static), subset as an SVG sprite | current | Interface icons | ISC License (`ISC`); the Feather-derived icons MIT (`MIT`) | `vendor/icons/Lucide-LICENSE.txt` |

## Apache ECharts

Copyright 2017-2024 The Apache Software Foundation. This product includes
software developed at The Apache Software Foundation (https://www.apache.org/).
Licensed under the Apache License, Version 2.0; you may not use this file
except in compliance with the License. A copy is in `vendor/echarts.LICENSE`.
The ECharts NOTICE file is reproduced in `vendor/echarts.NOTICE`.

## Inter

Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter).
This Font Software is licensed under the SIL Open Font License, Version 1.1,
with no Reserved Font Name. The font was subset (Basic Latin, Latin-1, common
punctuation, currency, arrows and maths symbols) and embedded as a data URI;
the licence travels with it in `vendor/fonts/Inter-OFL.txt`. The OpenDash
wordmark and lockups in `assets/brand/` use Inter's letterforms converted to
outlines, under the same licence (see `assets/brand/BRAND.md`).

## Lucide

Copyright (c) Lucide Icons and Contributors. ISC License. Parts of Lucide are
derived from Feather (Copyright (c) 2013-2023 Cole Bemis, MIT License). The
icons used by the app are collected into `vendor/icons/lucide-sprite.svg` by
`tools/build-icon-sprite.mjs`; the licence is in `vendor/icons/Lucide-LICENSE.txt`.
