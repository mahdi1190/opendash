# Third-party notices

OpenDash is MIT licensed (see `LICENSE`) and has no npm dependencies. It ships
three third-party components, vendored in `vendor/` and built into the single
`index.html`. Each keeps its own licence; the full texts are next to the files.
The travel features also carry three public data sets, reduced into one
generated file (see "Travel place tables"). Scene recipes may hold layouts
derived from OpenStreetMap and hill outlines derived from open elevation data
(see the last two sections).

| Component | Version | Used for | Licence (SPDX) | Full text |
|---|---|---|---|---|
| Apache ECharts | 5.6.1 | Charts in Finances | Apache License 2.0 (`Apache-2.0`) | `vendor/echarts.LICENSE`, `vendor/echarts.NOTICE` |
| Inter (rsms/inter), variable, Latin subset | 4.x | The interface font | SIL Open Font License 1.1 (`OFL-1.1`) | `vendor/fonts/Inter-OFL.txt` |
| Lucide icons (lucide-static), subset as an SVG sprite | current | Interface icons | ISC License (`ISC`); the Feather-derived icons MIT (`MIT`) | `vendor/icons/Lucide-LICENSE.txt` |
| GeoNames cities15000 and countryInfo, a subset | 2026-10 | The travel features' city and country tables (`src/app/69-travel-data.js`) | Creative Commons Attribution 4.0 (`CC-BY-4.0`) | below |
| IANA time zone database (zone.tab, backward links) | 2025 | Time zone to country and city | Public domain | below |
| OurAirports airports, a subset | 2026-10 | Airport codes to cities | Public domain | below |
| name-suggestion-index, a reduced table | 8.0.20260918 | Vendor names in Money (`src/app/67-fin-symbols-db.js`) | BSD 3-Clause (`BSD-3-Clause`) | below |
| Simple Icons and Wikimedia Commons logos, a selection | 2026-10 | Company logos in Money; each with its own source and status (`assets/brands/SOURCES.json`) | See "Company names and logos" | below |
| OpenStreetMap data, projected into scene layouts | per scene (`scene.source.osm.fetched`) | The layouts of scenes marked as containing OpenStreetMap data | Open Database License 1.0 (`ODbL-1.0`) | below |
| Terrain Tiles (AWS Open Data) and OS Terrain 50 heights, sampled into hill outlines | per scene (`scene.source.terrain`) | Ridges, skylines and relief of scenes with `scene.source.terrain` | per source, below | below |

## Company names and logos (Money)

<!-- vendors:begin -->
Logos are trademarks of their owners, used only to identify who a payment went to; no endorsement implied.

Freeflo's MIT licence does not cover these marks. They are bundled in `src/app/67-fin-symbols-dblogos.js` and nothing about a vendor is ever fetched at runtime. `assets/brands/SOURCES.json` records every logo: its source address, its licence or status, the date it was collected and any brand guidelines listed for it. To take a logo out, delete the vendor's logo field in `src/app/67-fin-symbols-db.js` (or its line in the logos file): the vendor falls back to Freeflo's own pictogram and colours. Settings > Money look > Show company logos switches them all off.

- **Vendor names and other names**: name-suggestion-index 8.0.20260918 (BSD 3-Clause, Copyright 2026, name-suggestion-index contributors; https://github.com/osmlab/name-suggestion-index), reduced to one generated table at development time by `tools/build-vendor-db.mjs`. Redistribution and use in source and binary forms, with or without modification, are permitted provided that the copyright notice, this list of conditions and the following disclaimer are retained; the name of the copyright holder may not be used to endorse products derived from this data without permission. THE DATA IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
- **101 one-colour marks**: Simple Icons 16.36.0 (the collection is CC0-1.0; https://github.com/simple-icons/simple-icons). Its disclaimer says this does not mean every icon is CC0, so each icon's own licence is recorded, and icons under NC, ND, GPL-family or custom terms were left out.
- **161 logos**: Wikimedia Commons, found through Wikidata (CC0 data). Each file's page gave a public-domain or CC0 status, except the 6 listed below, which carry a free licence that asks for a credit. Commons judges "public domain" mostly under US law, for text and simple shapes; that may differ in other countries, and a trademark is a separate right in any case.
  - Premier Inn: CC BY-SA 4.0, VAnttinen, https://commons.wikimedia.org/wiki/File:PREM0001_4C_ROUNDEL_RIGHT_GERMANY_trans@2x.png
  - Subway: CC BY-SA 4.0, 292Jacob, https://commons.wikimedia.org/wiki/File:Subway_icon.svg
  - Channel 4: CC BY-SA 4.0, LCampC4, https://commons.wikimedia.org/wiki/File:Channel_4_Logo_2023.svg
  - GoCompare: CC BY-SA 4.0, Rlloydgocompare, https://commons.wikimedia.org/wiki/File:GoCompare_Primary_Linear_GREEN.svg
  - Save the Children: CC BY-SA 4.0, „Save the Children Deutschland e.V., Pressestelle“ (Diskussion), https://commons.wikimedia.org/wiki/File:Save_the_Children_logo_(cropped).svg
  - Squarespace: CC BY 4.0, Font Awesome, https://commons.wikimedia.org/wiki/File:Font_Awesome_5_brands_squarespace.svg

The pictograms, scenes and easter-egg drawings in Money are original to Freeflo (`src/app/67-fin-symbols-kit.js`, `src/finance/28-money-scenes.js`, `src/finance/29-money-eggs.js`).
<!-- vendors:end -->

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
the licence travels with it in `vendor/fonts/Inter-OFL.txt`. The Freeflo
wordmark in `assets/brand/` is drawn as strokes and uses no font.

## Lucide

Copyright (c) Lucide Icons and Contributors. ISC License. Parts of Lucide are
derived from Feather (Copyright (c) 2013-2023 Cole Bemis, MIT License). The
icons used by the app are collected into `vendor/icons/lucide-sprite.svg` by
`tools/build-icon-sprite.mjs`; the licence is in `vendor/icons/Lucide-LICENSE.txt`.

## Travel place tables

`src/app/69-travel-data.js` is generated by `tools/build-travel-data.mjs` from
downloads that are not kept in the repository:

- **GeoNames** (https://www.geonames.org/): city names, positions, populations and
  time zones from `cities15000`, and country currencies, languages and capitals
  from `countryInfo`. Licensed under Creative Commons Attribution 4.0
  (https://creativecommons.org/licenses/by/4.0/). The data was reduced (about
  1,300 cities), renamed in places ("Antwerpen" shown as "Antwerp") and given
  extra aliases and place kinds. Settings > About repeats this attribution.
- **IANA time zone database** (https://www.iana.org/time-zones): `zone.tab` and the
  backward links of `tzdata.zi`. Public domain.
- **OurAirports** (https://ourairports.com/data/): IATA codes of airports with
  scheduled service. Public domain.

Plug types, driving side, emergency numbers, weekends, flags (drawn as simple
shapes, without coats of arms), greetings and public-holiday rules are
hand-written from published facts (`tools/travel-data-facts.mjs`,
`src/app/69-travel-holidays.js`). The optional online lookups (Nager.Date public
holidays, Frankfurter exchange rates, Open-Meteo weather) are web services the
dashboard asks at run time; nothing from them is bundled.

## UK county table

`src/app/71-uk-counties.js` (the opt-in regional animations) lists the main UK
towns with a position and the area each lies in: England's ceremonial counties,
Scotland's council areas, Wales's principal areas and Northern Ireland's
counties. It was compiled from open government data: the Office for National
Statistics geography products and Ordnance Survey's OS Open Names, both under
the Open Government Licence v3.0
(https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
Contains public sector information licensed under the Open Government Licence
v3.0; contains OS data © Crown copyright and database right. The data was reduced
to about 900 main towns, positions rounded to two decimals. No third-party
website was scraped.

## OpenStreetMap (scene layouts)

Scene layouts marked as containing OpenStreetMap data: (c) OpenStreetMap
contributors, available under the Open Database License 1.0 (ODbL);
https://www.openstreetmap.org/copyright

The authoring tool `node tools/anim-pack.mjs scene osm` (docs/dev/SCENE_ENGINE_V2.md
section 17) asks the Overpass API for the data of one view, keeps it in a
developer cache that is never committed (`.anim-ref/cache/osm/`), and projects
roads, paths, water, parks, railways, building footprints and landmark positions
into a scene recipe as plain numbers. Such a recipe is a derivative of the
OpenStreetMap database: its file header carries the line "Contains OpenStreetMap
data, (c) OpenStreetMap contributors, ODbL 1.0", its `scene.source.osm` records
when the data was fetched, and the derived data in it is offered under the ODbL.
The rest of the repository stays MIT. Names, brands and operators from
OpenStreetMap are never copied into drawn text (shop fronts show generic words
such as "Bakery"). The app never contacts OpenStreetMap: the gallery shows
"© OpenStreetMap contributors" under such scenes, and Settings > About links to
the copyright page.

## Terrain (hill outlines and relief)

`node tools/anim-pack.mjs scene terrain` (docs/dev/SCENE_ENGINE_V2.md section 18)
samples heights along a view and writes only the resulting outlines (screen rows),
the camera's ground altitude and an optional coarse relief grid into a recipe;
the tiles stay in the developer cache (`.anim-ref/cache/terrain/`), never
committed. A recipe records its source in `scene.source.terrain`, and the
gallery shows the matching credit line.

**Terrain Tiles** (the default source; the "terrarium" tiles of the Mapzen /
Tilezen joerd project, hosted as AWS Open Data at
https://registry.opendata.aws/terrain-tiles/). Its attribution document
(https://github.com/tilezen/joerd/blob/master/docs/attribution.md, as of commit
d8f587b) requires the following attribution, reproduced verbatim:

```
* ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and
  funded under National Science Foundation awards 1043681, 1559691, and 1542736;
* Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017;
* Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM)
  Österreich;
* Canada terrain data contains information licensed under the Open Government
  Licence – Canada;
* Europe terrain data produced using Copernicus data and information funded by the
  European Union - EU-DEM layers;
* Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration
* Mexico terrain data source: INEGI, Continental relief, 2016;
* New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New
  Zealand and the New Zealand Government (All rights reserved);
* Norway terrain data © Kartverket;
* United Kingdom terrain data © Environment Agency copyright and/or database right
  2015. All rights reserved;
* United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data
  courtesy of the U.S. Geological Survey.
```

The United Kingdom data is the data.gov.uk LIDAR Composite Digital Terrain
Model, licensed under the Open Government Licence v3.0
(https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
SRTM, GMTED2010 and 3DEP are public domain (U.S. Geological Survey). EU-DEM is
produced using Copernicus data and information funded by the European Union.
In the app, a scene's credit line names the attributions that apply to its area
(70-scene-1credit.js).

**OS Terrain 50** (an optional, local source for Great Britain:
`--dem os50 --dem-dir <folder>`; the tiles are downloaded by the developer and
never committed). Licensed under the Open Government Licence v3.0. Contains OS
data © Crown copyright and database right 2026.
