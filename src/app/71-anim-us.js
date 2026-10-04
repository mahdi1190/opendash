/* ============================================================
   US ANIMATION PACKS, the shared part. PURE classic script (no DOM, no fetches,
   nothing looked up online). Loads before the packs (72-anim-pack-us-*.js).
   Where in the US the user is, offline:
     - travel: ctx.city is '<place id>-us' for a place in US_PLACES (New York is left to the
       world pack, which already draws it for travellers)
     - home: the weather town (ctx.lat / ctx.lon): an art place (big or small city) within
       its radius gives the place; any table row (anchors included) within US_STATE_KM gives
       the STATE (nearest row wins, so right beside a border it can be the neighbour).
   Texas has its own pack (72-anim-pack-texas.js); the table still carries Texas rows so
   that Texas is never mistaken for Oklahoma or Louisiana, but no us-* item is for TX.
   Items carry usKind: 'state' | 'city', usState (two letters) and, for a city, usPlace.
     state    priority 1: a signature opening (slot opening) and an element (slot symbol) per state
     city     priority 1.2: big city = a signature opening, small city = an element (symbol)
   A festival or the birthday (priority 2+) still wins the day.
   Guide: docs/dev/US_PACK.md. Gate: tests/anim-packs.test.mjs, tests/us-pack.test.mjs.
   ============================================================ */
/** The 50 states: code -> [name, group]. */
const US_STATES = {
  AL: ['Alabama', 'southeast'], AK: ['Alaska', 'pacific'], AZ: ['Arizona', 'mountain'], AR: ['Arkansas', 'southeast'], CA: ['California', 'pacific'],
  CO: ['Colorado', 'mountain'], CT: ['Connecticut', 'northeast'], DE: ['Delaware', 'northeast'], FL: ['Florida', 'southeast'], GA: ['Georgia', 'southeast'],
  HI: ['Hawaii', 'pacific'], ID: ['Idaho', 'mountain'], IL: ['Illinois', 'midwest'], IN: ['Indiana', 'midwest'], IA: ['Iowa', 'midwest'],
  KS: ['Kansas', 'midwest'], KY: ['Kentucky', 'southeast'], LA: ['Louisiana', 'southeast'], ME: ['Maine', 'northeast'], MD: ['Maryland', 'northeast'],
  MA: ['Massachusetts', 'northeast'], MI: ['Michigan', 'midwest'], MN: ['Minnesota', 'midwest'], MS: ['Mississippi', 'southeast'], MO: ['Missouri', 'midwest'],
  MT: ['Montana', 'mountain'], NE: ['Nebraska', 'midwest'], NV: ['Nevada', 'mountain'], NH: ['New Hampshire', 'northeast'], NJ: ['New Jersey', 'northeast'],
  NM: ['New Mexico', 'mountain'], NY: ['New York', 'northeast'], NC: ['North Carolina', 'southeast'], ND: ['North Dakota', 'midwest'], OH: ['Ohio', 'midwest'],
  OK: ['Oklahoma', 'mountain'], OR: ['Oregon', 'pacific'], PA: ['Pennsylvania', 'northeast'], RI: ['Rhode Island', 'northeast'], SC: ['South Carolina', 'southeast'],
  SD: ['South Dakota', 'midwest'], TN: ['Tennessee', 'southeast'], TX: ['Texas', 'texas'], UT: ['Utah', 'mountain'], VT: ['Vermont', 'northeast'],
  VA: ['Virginia', 'southeast'], WA: ['Washington', 'pacific'], WV: ['West Virginia', 'southeast'], WI: ['Wisconsin', 'midwest'], WY: ['Wyoming', 'mountain'],
};
/**
 * Places: [id, name, state, lat, lon, kind]. kind 'big' (a big city, has a signature opening), 'small' (a small
 * city or town, has an element) or '' (an anchor: only tells which state a position is in). DC is its own row
 * (state 'DC': it has no state pack, a big city item only). The id plus '-us' is the travel city id.
 */
const US_PLACES = [
  // Northeast
  ['new-york', 'New York', 'NY', 40.71, -74.01, 'big'], ['buffalo', 'Buffalo', 'NY', 42.89, -78.88, 'big'], ['albany', 'Albany', 'NY', 42.65, -73.76, ''],
  ['syracuse', 'Syracuse', 'NY', 43.05, -76.15, ''], ['binghamton', 'Binghamton', 'NY', 42.1, -75.91, ''], ['lake-placid', 'Lake Placid', 'NY', 44.28, -73.98, 'small'],
  ['watertown-ny', 'Watertown', 'NY', 43.97, -75.91, ''], ['philadelphia', 'Philadelphia', 'PA', 39.95, -75.17, 'big'], ['pittsburgh', 'Pittsburgh', 'PA', 40.44, -80.0, 'big'],
  ['harrisburg', 'Harrisburg', 'PA', 40.27, -76.88, ''], ['erie', 'Erie', 'PA', 42.13, -80.09, ''], ['scranton', 'Scranton', 'PA', 41.41, -75.66, ''],
  ['gettysburg', 'Gettysburg', 'PA', 39.83, -77.23, 'small'], ['hershey', 'Hershey', 'PA', 40.29, -76.65, 'small'], ['state-college', 'State College', 'PA', 40.79, -77.86, ''],
  ['boston', 'Boston', 'MA', 42.36, -71.06, 'big'], ['springfield-ma', 'Springfield', 'MA', 42.1, -72.59, ''], ['worcester', 'Worcester', 'MA', 42.26, -71.8, ''],
  ['salem', 'Salem', 'MA', 42.52, -70.9, 'small'], ['provincetown', 'Provincetown', 'MA', 42.06, -70.19, 'small'], ['pittsfield', 'Pittsfield', 'MA', 42.45, -73.25, ''],
  ['hartford', 'Hartford', 'CT', 41.76, -72.67, ''], ['new-haven', 'New Haven', 'CT', 41.31, -72.92, ''], ['mystic', 'Mystic', 'CT', 41.35, -71.97, 'small'],
  ['stamford', 'Stamford', 'CT', 41.05, -73.54, ''], ['providence', 'Providence', 'RI', 41.82, -71.41, ''], ['newport', 'Newport', 'RI', 41.49, -71.31, 'small'],
  ['manchester-nh', 'Manchester', 'NH', 42.99, -71.46, ''], ['portsmouth', 'Portsmouth', 'NH', 43.07, -70.76, 'small'], ['north-conway', 'North Conway', 'NH', 44.05, -71.13, 'small'],
  ['concord-nh', 'Concord', 'NH', 43.21, -71.54, ''], ['burlington-vt', 'Burlington', 'VT', 44.48, -73.21, 'small'], ['montpelier', 'Montpelier', 'VT', 44.26, -72.58, ''],
  ['brattleboro', 'Brattleboro', 'VT', 42.85, -72.56, ''], ['stowe', 'Stowe', 'VT', 44.47, -72.69, 'small'], ['portland-me', 'Portland', 'ME', 43.66, -70.26, 'small'],
  ['bangor', 'Bangor', 'ME', 44.8, -68.77, ''], ['bar-harbor', 'Bar Harbor', 'ME', 44.39, -68.2, 'small'], ['caribou', 'Caribou', 'ME', 46.86, -68.01, ''],
  ['newark', 'Newark', 'NJ', 40.74, -74.17, ''], ['atlantic-city', 'Atlantic City', 'NJ', 39.36, -74.42, 'small'], ['trenton', 'Trenton', 'NJ', 40.22, -74.76, ''],
  ['wilmington-de', 'Wilmington', 'DE', 39.74, -75.55, ''], ['dover', 'Dover', 'DE', 39.16, -75.52, ''], ['rehoboth-beach', 'Rehoboth Beach', 'DE', 38.72, -75.08, 'small'],
  ['baltimore', 'Baltimore', 'MD', 39.29, -76.61, 'big'], ['annapolis', 'Annapolis', 'MD', 38.98, -76.49, 'small'], ['hagerstown', 'Hagerstown', 'MD', 39.64, -77.72, ''],
  ['salisbury', 'Salisbury', 'MD', 38.36, -75.6, ''], ['cumberland', 'Cumberland', 'MD', 39.65, -78.76, ''], ['washington', 'Washington, DC', 'DC', 38.91, -77.04, 'big'],
  // Southeast
  ['richmond', 'Richmond', 'VA', 37.54, -77.44, ''], ['virginia-beach', 'Virginia Beach', 'VA', 36.85, -75.98, 'big'], ['roanoke', 'Roanoke', 'VA', 37.27, -79.94, ''],
  ['williamsburg', 'Williamsburg', 'VA', 37.27, -76.71, 'small'], ['abingdon', 'Abingdon', 'VA', 36.71, -81.98, ''], ['charleston-wv', 'Charleston', 'WV', 38.35, -81.63, ''],
  ['morgantown', 'Morgantown', 'WV', 39.63, -79.96, ''], ['harpers-ferry', 'Harpers Ferry', 'WV', 39.32, -77.73, 'small'], ['lewisburg-wv', 'Lewisburg', 'WV', 37.8, -80.45, ''],
  ['charlotte', 'Charlotte', 'NC', 35.23, -80.84, 'big'], ['raleigh', 'Raleigh', 'NC', 35.78, -78.64, ''], ['asheville', 'Asheville', 'NC', 35.6, -82.55, 'small'],
  ['kitty-hawk', 'Kitty Hawk', 'NC', 36.07, -75.7, 'small'], ['wilmington-nc', 'Wilmington', 'NC', 34.23, -77.94, ''], ['charleston-sc', 'Charleston', 'SC', 32.78, -79.93, 'small'],
  ['columbia-sc', 'Columbia', 'SC', 34.0, -81.03, ''], ['greenville-sc', 'Greenville', 'SC', 34.85, -82.4, ''], ['myrtle-beach', 'Myrtle Beach', 'SC', 33.69, -78.89, 'small'],
  ['atlanta', 'Atlanta', 'GA', 33.75, -84.39, 'big'], ['savannah', 'Savannah', 'GA', 32.08, -81.09, 'small'], ['macon', 'Macon', 'GA', 32.84, -83.63, ''],
  ['albany-ga', 'Albany', 'GA', 31.58, -84.16, ''], ['miami', 'Miami', 'FL', 25.76, -80.19, 'big'], ['orlando', 'Orlando', 'FL', 28.54, -81.38, 'big'],
  ['tampa', 'Tampa', 'FL', 27.95, -82.46, 'big'], ['jacksonville', 'Jacksonville', 'FL', 30.33, -81.66, ''], ['key-west', 'Key West', 'FL', 24.56, -81.78, 'small'],
  ['pensacola', 'Pensacola', 'FL', 30.42, -87.22, ''], ['tallahassee', 'Tallahassee', 'FL', 30.44, -84.28, ''], ['st-augustine', 'St. Augustine', 'FL', 29.9, -81.31, 'small'],
  ['birmingham', 'Birmingham', 'AL', 33.52, -86.8, ''], ['huntsville', 'Huntsville', 'AL', 34.73, -86.59, 'small'], ['mobile', 'Mobile', 'AL', 30.69, -88.04, ''],
  ['montgomery', 'Montgomery', 'AL', 32.37, -86.3, ''], ['jackson-ms', 'Jackson', 'MS', 32.3, -90.18, ''], ['biloxi', 'Biloxi', 'MS', 30.4, -88.89, 'small'],
  ['tupelo', 'Tupelo', 'MS', 34.26, -88.7, ''], ['natchez', 'Natchez', 'MS', 31.56, -91.4, 'small'], ['nashville', 'Nashville', 'TN', 36.16, -86.78, 'big'],
  ['memphis', 'Memphis', 'TN', 35.15, -90.05, 'big'], ['knoxville', 'Knoxville', 'TN', 35.96, -83.92, ''], ['gatlinburg', 'Gatlinburg', 'TN', 35.71, -83.51, 'small'],
  ['chattanooga', 'Chattanooga', 'TN', 35.05, -85.31, ''], ['louisville', 'Louisville', 'KY', 38.25, -85.76, 'big'], ['lexington', 'Lexington', 'KY', 38.04, -84.5, ''],
  ['bowling-green', 'Bowling Green', 'KY', 36.99, -86.44, ''], ['paducah', 'Paducah', 'KY', 37.08, -88.6, ''], ['new-orleans', 'New Orleans', 'LA', 29.95, -90.07, 'big'],
  ['baton-rouge', 'Baton Rouge', 'LA', 30.45, -91.15, ''], ['lafayette', 'Lafayette', 'LA', 30.22, -92.02, 'small'], ['shreveport', 'Shreveport', 'LA', 32.53, -93.75, ''],
  ['lake-charles', 'Lake Charles', 'LA', 30.23, -93.22, ''], ['little-rock', 'Little Rock', 'AR', 34.75, -92.29, ''], ['hot-springs', 'Hot Springs', 'AR', 34.5, -93.05, 'small'],
  ['fayetteville-ar', 'Fayetteville', 'AR', 36.06, -94.16, ''], ['jonesboro', 'Jonesboro', 'AR', 35.84, -90.7, ''],
  // Midwest
  ['chicago', 'Chicago', 'IL', 41.88, -87.63, 'big'], ['springfield-il', 'Springfield', 'IL', 39.8, -89.65, ''], ['carbondale', 'Carbondale', 'IL', 37.73, -89.22, ''],
  ['peoria', 'Peoria', 'IL', 40.69, -89.59, ''], ['galena', 'Galena', 'IL', 42.42, -90.43, 'small'], ['indianapolis', 'Indianapolis', 'IN', 39.77, -86.16, 'big'],
  ['fort-wayne', 'Fort Wayne', 'IN', 41.08, -85.14, ''], ['evansville', 'Evansville', 'IN', 37.97, -87.57, ''], ['south-bend', 'South Bend', 'IN', 41.68, -86.25, ''],
  ['cleveland', 'Cleveland', 'OH', 41.5, -81.69, 'big'], ['columbus', 'Columbus', 'OH', 39.96, -83.0, ''], ['cincinnati', 'Cincinnati', 'OH', 39.1, -84.51, 'big'],
  ['toledo', 'Toledo', 'OH', 41.65, -83.54, ''], ['athens-oh', 'Athens', 'OH', 39.33, -82.1, ''], ['sandusky', 'Sandusky', 'OH', 41.45, -82.71, 'small'],
  ['detroit', 'Detroit', 'MI', 42.33, -83.05, 'big'], ['grand-rapids', 'Grand Rapids', 'MI', 42.96, -85.67, ''], ['traverse-city', 'Traverse City', 'MI', 44.76, -85.62, 'small'],
  ['marquette', 'Marquette', 'MI', 46.54, -87.4, ''], ['mackinac-island', 'Mackinac Island', 'MI', 45.85, -84.62, 'small'], ['lansing', 'Lansing', 'MI', 42.73, -84.56, ''],
  ['milwaukee', 'Milwaukee', 'WI', 43.04, -87.91, 'big'], ['madison', 'Madison', 'WI', 43.07, -89.4, ''], ['green-bay', 'Green Bay', 'WI', 44.52, -88.02, ''],
  ['wisconsin-dells', 'Wisconsin Dells', 'WI', 43.63, -89.77, 'small'], ['eau-claire', 'Eau Claire', 'WI', 44.81, -91.5, ''], ['minneapolis', 'Minneapolis', 'MN', 44.98, -93.27, 'big'],
  ['duluth', 'Duluth', 'MN', 46.79, -92.1, 'small'], ['rochester-mn', 'Rochester', 'MN', 44.02, -92.47, ''], ['saint-paul', 'Saint Paul', 'MN', 44.95, -93.09, ''],
  ['bemidji', 'Bemidji', 'MN', 47.47, -94.88, ''], ['des-moines', 'Des Moines', 'IA', 41.59, -93.62, ''], ['cedar-rapids', 'Cedar Rapids', 'IA', 41.98, -91.67, ''],
  ['sioux-city', 'Sioux City', 'IA', 42.5, -96.4, ''], ['dubuque', 'Dubuque', 'IA', 42.5, -90.66, 'small'], ['st-louis', 'St. Louis', 'MO', 38.63, -90.2, 'big'],
  ['kansas-city', 'Kansas City', 'MO', 39.1, -94.58, 'big'], ['branson', 'Branson', 'MO', 36.64, -93.22, 'small'], ['springfield-mo', 'Springfield', 'MO', 37.21, -93.29, ''],
  ['columbia-mo', 'Columbia', 'MO', 38.95, -92.33, ''], ['wichita', 'Wichita', 'KS', 37.69, -97.34, ''], ['topeka', 'Topeka', 'KS', 39.05, -95.68, ''],
  ['dodge-city', 'Dodge City', 'KS', 37.75, -100.02, 'small'], ['goodland', 'Goodland', 'KS', 39.35, -101.71, ''], ['omaha', 'Omaha', 'NE', 41.26, -95.93, 'big'],
  ['lincoln', 'Lincoln', 'NE', 40.81, -96.7, ''], ['north-platte', 'North Platte', 'NE', 41.14, -100.76, ''], ['scottsbluff', 'Scottsbluff', 'NE', 41.87, -103.67, 'small'],
  ['fargo', 'Fargo', 'ND', 46.88, -96.79, ''], ['bismarck', 'Bismarck', 'ND', 46.81, -100.78, ''], ['minot', 'Minot', 'ND', 48.23, -101.3, ''],
  ['medora', 'Medora', 'ND', 46.92, -103.52, 'small'], ['sioux-falls', 'Sioux Falls', 'SD', 43.55, -96.73, ''], ['rapid-city', 'Rapid City', 'SD', 44.08, -103.23, 'small'],
  ['pierre', 'Pierre', 'SD', 44.37, -100.35, ''], ['mitchell', 'Mitchell', 'SD', 43.71, -98.03, 'small'], ['aberdeen-sd', 'Aberdeen', 'SD', 45.46, -98.49, ''],
  // Mountain and Southwest
  ['denver', 'Denver', 'CO', 39.74, -104.99, 'big'], ['colorado-springs', 'Colorado Springs', 'CO', 38.83, -104.82, ''], ['aspen', 'Aspen', 'CO', 39.19, -106.82, 'small'],
  ['grand-junction', 'Grand Junction', 'CO', 39.06, -108.55, ''], ['durango', 'Durango', 'CO', 37.27, -107.88, ''], ['boulder', 'Boulder', 'CO', 40.01, -105.27, 'small'],
  ['salt-lake-city', 'Salt Lake City', 'UT', 40.76, -111.89, 'big'], ['moab', 'Moab', 'UT', 38.57, -109.55, 'small'], ['st-george', 'St. George', 'UT', 37.1, -113.58, ''],
  ['park-city', 'Park City', 'UT', 40.65, -111.5, 'small'], ['logan', 'Logan', 'UT', 41.74, -111.83, ''], ['las-vegas', 'Las Vegas', 'NV', 36.17, -115.14, 'big'],
  ['reno', 'Reno', 'NV', 39.53, -119.81, ''], ['elko', 'Elko', 'NV', 40.83, -115.76, ''], ['tonopah', 'Tonopah', 'NV', 38.07, -117.23, 'small'],
  ['phoenix', 'Phoenix', 'AZ', 33.45, -112.07, 'big'], ['tucson', 'Tucson', 'AZ', 32.22, -110.97, ''], ['sedona', 'Sedona', 'AZ', 34.87, -111.76, 'small'],
  ['flagstaff', 'Flagstaff', 'AZ', 35.2, -111.65, ''], ['page', 'Page', 'AZ', 36.91, -111.46, 'small'], ['yuma', 'Yuma', 'AZ', 32.69, -114.63, ''],
  ['albuquerque', 'Albuquerque', 'NM', 35.08, -106.65, ''], ['santa-fe', 'Santa Fe', 'NM', 35.69, -105.94, 'small'], ['roswell', 'Roswell', 'NM', 33.39, -104.52, 'small'],
  ['las-cruces', 'Las Cruces', 'NM', 32.31, -106.78, ''], ['farmington', 'Farmington', 'NM', 36.73, -108.22, ''], ['oklahoma-city', 'Oklahoma City', 'OK', 35.47, -97.52, 'big'],
  ['tulsa', 'Tulsa', 'OK', 36.15, -95.99, ''], ['lawton', 'Lawton', 'OK', 34.6, -98.39, ''], ['guymon', 'Guymon', 'OK', 36.68, -101.48, ''],
  ['mcalester', 'McAlester', 'OK', 34.93, -95.77, ''], ['boise', 'Boise', 'ID', 43.62, -116.2, ''], ['idaho-falls', 'Idaho Falls', 'ID', 43.49, -112.04, ''],
  ['coeur-d-alene', "Coeur d'Alene", 'ID', 47.68, -116.78, 'small'], ['sun-valley', 'Sun Valley', 'ID', 43.7, -114.35, 'small'], ['lewiston', 'Lewiston', 'ID', 46.42, -117.02, ''],
  ['twin-falls', 'Twin Falls', 'ID', 42.56, -114.46, ''], ['billings', 'Billings', 'MT', 45.78, -108.5, ''], ['missoula', 'Missoula', 'MT', 46.87, -114.0, ''],
  ['helena', 'Helena', 'MT', 46.59, -112.04, ''], ['bozeman', 'Bozeman', 'MT', 45.68, -111.04, 'small'], ['whitefish', 'Whitefish', 'MT', 48.41, -114.34, 'small'],
  ['great-falls', 'Great Falls', 'MT', 47.5, -111.3, ''], ['glendive', 'Glendive', 'MT', 47.1, -104.7, ''], ['cheyenne', 'Cheyenne', 'WY', 41.14, -104.82, ''],
  ['jackson-wy', 'Jackson', 'WY', 43.48, -110.76, 'small'], ['casper', 'Casper', 'WY', 42.87, -106.31, ''], ['cody', 'Cody', 'WY', 44.53, -109.06, 'small'],
  ['sheridan', 'Sheridan', 'WY', 44.8, -106.96, ''], ['rock-springs', 'Rock Springs', 'WY', 41.59, -109.2, ''],
  // Pacific
  ['los-angeles', 'Los Angeles', 'CA', 34.05, -118.24, 'big'], ['san-francisco', 'San Francisco', 'CA', 37.77, -122.42, 'big'], ['san-diego', 'San Diego', 'CA', 32.72, -117.16, 'big'],
  ['sacramento', 'Sacramento', 'CA', 38.58, -121.49, ''], ['fresno', 'Fresno', 'CA', 36.74, -119.79, ''], ['santa-cruz', 'Santa Cruz', 'CA', 36.97, -122.03, 'small'],
  ['palm-springs', 'Palm Springs', 'CA', 33.83, -116.55, 'small'], ['eureka', 'Eureka', 'CA', 40.8, -124.16, ''], ['redding', 'Redding', 'CA', 40.59, -122.39, ''],
  ['bakersfield', 'Bakersfield', 'CA', 35.37, -119.02, ''], ['santa-barbara', 'Santa Barbara', 'CA', 34.42, -119.7, 'small'], ['south-lake-tahoe', 'South Lake Tahoe', 'CA', 38.94, -119.98, 'small'],
  ['san-jose', 'San Jose', 'CA', 37.34, -121.89, ''], ['portland-or', 'Portland', 'OR', 45.52, -122.68, 'big'], ['bend', 'Bend', 'OR', 44.06, -121.31, 'small'],
  ['astoria', 'Astoria', 'OR', 46.19, -123.83, 'small'], ['eugene', 'Eugene', 'OR', 44.05, -123.09, ''], ['medford', 'Medford', 'OR', 42.33, -122.87, ''],
  ['salem-or', 'Salem', 'OR', 44.94, -123.04, ''], ['pendleton', 'Pendleton', 'OR', 45.67, -118.79, ''], ['burns', 'Burns', 'OR', 43.59, -119.05, ''],
  ['seattle', 'Seattle', 'WA', 47.61, -122.33, 'big'], ['spokane', 'Spokane', 'WA', 47.66, -117.43, ''], ['tacoma', 'Tacoma', 'WA', 47.25, -122.44, ''],
  ['leavenworth', 'Leavenworth', 'WA', 47.6, -120.66, 'small'], ['walla-walla', 'Walla Walla', 'WA', 46.06, -118.34, ''], ['bellingham', 'Bellingham', 'WA', 48.75, -122.48, 'small'],
  ['port-angeles', 'Port Angeles', 'WA', 48.12, -123.43, ''], ['yakima', 'Yakima', 'WA', 46.6, -120.51, ''], ['anchorage', 'Anchorage', 'AK', 61.22, -149.9, 'big'],
  ['juneau', 'Juneau', 'AK', 58.3, -134.42, 'small'], ['fairbanks', 'Fairbanks', 'AK', 64.84, -147.72, 'small'], ['nome', 'Nome', 'AK', 64.5, -165.4, ''],
  ['utqiagvik', 'Utqiagvik', 'AK', 71.29, -156.79, ''], ['sitka', 'Sitka', 'AK', 57.05, -135.33, ''], ['honolulu', 'Honolulu', 'HI', 21.31, -157.86, 'big'],
  ['hilo', 'Hilo', 'HI', 19.72, -155.09, 'small'], ['lahaina', 'Lahaina', 'HI', 20.88, -156.68, 'small'], ['lihue', 'Lihue', 'HI', 21.98, -159.37, ''],
  ['kailua-kona', 'Kailua-Kona', 'HI', 19.64, -155.99, ''],
  // Texas rows (no us-* items: the Texas pack owns Texas): they stop Texas reading as a neighbour
  ['houston', 'Houston', 'TX', 29.76, -95.37, ''], ['dallas', 'Dallas', 'TX', 32.78, -96.8, ''], ['austin', 'Austin', 'TX', 30.27, -97.74, ''],
  ['san-antonio', 'San Antonio', 'TX', 29.42, -98.49, ''], ['el-paso', 'El Paso', 'TX', 31.76, -106.49, ''], ['amarillo', 'Amarillo', 'TX', 35.22, -101.83, ''],
  ['lubbock', 'Lubbock', 'TX', 33.58, -101.86, ''], ['corpus-christi', 'Corpus Christi', 'TX', 27.8, -97.4, ''], ['laredo', 'Laredo', 'TX', 27.51, -99.51, ''],
  ['midland', 'Midland', 'TX', 32.0, -102.08, ''], ['tyler', 'Tyler', 'TX', 32.35, -95.3, ''], ['abilene', 'Abilene', 'TX', 32.45, -99.73, ''],
  ['texarkana', 'Texarkana', 'TX', 33.43, -94.05, ''], ['wichita-falls', 'Wichita Falls', 'TX', 33.91, -98.49, ''], ['brownsville', 'Brownsville', 'TX', 25.9, -97.5, ''],
];
const US_STATE_KM = 190;                       // beyond this from every row the position is not in the US (Canada, Mexico, the sea)
const US_PLACE_KM = { big: 50, small: 30 };    // how close counts as "in" a city / a town
const _usKm = (la1, lo1, la2, lo2) => {
  const r = Math.PI / 180, dl = (la2 - la1) * r, dg = (lo2 - lo1) * r;
  const a = Math.sin(dl / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dg / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};
const _usHasPos = (ctx) => !!ctx && ctx.lat != null && ctx.lon != null && isFinite(ctx.lat) && isFinite(ctx.lon);
const _usRow = (id) => US_PLACES.find(p => p[0] === id) || null;
const _usObj = (p) => p ? { id: p[0], name: p[1], state: p[2], kind: p[5] } : null;
/** The art place (a big or small city) for a ctx, {id, name, state, kind} or null. Travel wins (a trip to New York is the world pack's). */
function usPlace(ctx) {
  if (!ctx) return null;
  if (ctx.city) {
    const m = /^(.+)-us$/.exec(String(ctx.city));
    const p = m && m[1] !== 'new-york' ? _usRow(m[1]) : null;
    return p && p[5] ? _usObj(p) : null;
  }
  if (!_usHasPos(ctx)) return null;
  let best = null, bd = Infinity;
  for (const p of US_PLACES) {
    if (!p[5]) continue;
    const d = _usKm(ctx.lat, ctx.lon, p[3], p[4]);
    if (d <= US_PLACE_KM[p[5]] && d < bd) { bd = d; best = p; }
  }
  return _usObj(best);
}
/** The state code for a ctx ('' = not in the US, or travelling somewhere that is not a US place). Nearest table row wins. */
function usStateOf(ctx) {
  if (!ctx) return '';
  if (ctx.city) { const m = /^(.+)-us$/.exec(String(ctx.city)); const p = m ? _usRow(m[1]) : null; return p ? p[2] : ''; }
  if (!_usHasPos(ctx)) return '';
  let best = '', bd = US_STATE_KM;
  for (const p of US_PLACES) { const d = _usKm(ctx.lat, ctx.lon, p[3], p[4]); if (d < bd) { bd = d; best = p[2]; } }
  return best;
}
/** For the page (the opening sequence): where in the US, {id, name, state, stateName, kind} or null (Texas has its own pack). A town wins, else the state. */
function usWhere(ctx) {
  const st = usStateOf(ctx);
  if (st === 'DC') return { id: 'washington', name: 'Washington, DC', state: 'DC', stateName: 'Washington, DC', kind: 'big' };
  if (!st || st === 'TX' || !US_STATES[st]) return null;
  const p = usPlace(ctx);
  return p && p.state === st ? Object.assign({ stateName: US_STATES[st][0] }, p) : { id: '', name: US_STATES[st][0], state: st, stateName: US_STATES[st][0], kind: '' };
}
/**
 * A builder for a US pack file: const B = usBuilder('northeast'); B.state('NY', 'signature', {...}); B.place('buffalo', {...});
 * Then animRegisterPack(B.pack({id, name, description})). state(): kind 'signature' (opening) | 'element' (symbol).
 * place(): the place's kind decides the slot (big = opening, small = symbol). `o` is an ordinary item (id, label, colour, svg ...).
 */
function usBuilder(group) {
  const items = [];
  const base = { mood: 'neutral', intensity: 'subtle', theme: 'any', season: 'any', region: ['US'], reduced: 'static', priority: 1, country: 'US' };
  return {
    items,
    state(st, kind, o) {
      const nm = US_STATES[st];
      if (!nm || nm[1] !== group) throw new Error('us pack ' + group + ': ' + st + ' is not a ' + group + ' state');
      if (kind !== 'signature' && kind !== 'element') throw new Error('us pack: kind ' + kind);
      items.push(Object.assign({}, base, { slot: kind === 'signature' ? 'opening' : 'symbol', usKind: 'state', usState: st, usSignature: kind === 'signature', state: st,
        when: (day, ctx) => usStateOf(ctx) === st }, o, { id: st.toLowerCase() + '-' + o.id, label: o.label + ', ' + nm[0], tags: ['usa', 'us-state', nm[0].toLowerCase(), st.toLowerCase(), kind].concat(o.tags || []) }));
    },
    place(id, o) {
      const p = US_PLACES.find(x => x[0] === id);
      if (!p || !p[5]) throw new Error('us pack: ' + id + ' is not an art place');
      if (US_STATES[p[2]] && US_STATES[p[2]][1] !== group && p[2] !== 'DC') throw new Error('us pack ' + group + ': ' + id + ' belongs to another group');
      items.push(Object.assign({}, base, { slot: p[5] === 'big' ? 'opening' : 'symbol', usKind: 'city', usState: p[2], usPlace: id, usSize: p[5], state: p[2], priority: 1.2,
        when: (day, ctx) => { const q = usPlace(ctx); return !!q && q.id === id; } }, o, { id: id + '-' + o.id, label: o.label + ', ' + p[1], tags: ['usa', 'us-city', p[1].toLowerCase(), p[2].toLowerCase(), p[5]].concat(o.tags || []) }));
    },
    pack(m) { return Object.assign({ version: '1.0.0', css: '', items }, m); },
  };
}
