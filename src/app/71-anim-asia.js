/* ============================================================
   ASIA ANIMATION PACKS, the shared part: Asia as a REGION CONFIG over the generic framework (71-anim-0region.js,
   which owns the lookups, the builder and the scene kit). PURE classic script (no DOM, no fetches, nothing
   looked up online). Loads before the packs (72-anim-pack-asia-*.js). Where in Asia the user is, offline:
     - travel: ctx.city is '<place id>-<cc>' for a place in ASIA_PLACES (the travel tables' ids; Tokyo,
       Singapore and Dubai are the world pack's while travelling: ASIA_WORLD_TRAVEL)
     - home: the weather town (ctx.lat / ctx.lon): an art place (big or small city) within its radius
       gives the place; any table row (anchors included) within ASIA_COUNTRY_KM gives the COUNTRY
       (nearest row wins, so beside a border it can be the neighbour).
   Items carry asiaKind: 'country' | 'city', asiaCc (ISO 3166 alpha-2) and, for a city, asiaPlace.
     country  priority 1: a full-screen signature opening (slot opening) and a small element (slot symbol)
     city     priority 1.2: big city = a full-screen signature opening, small city = a small element (symbol)
   The full-screen scenes are drawn in 71-anim-asia2-scenes-*.js and registered with asiaSceneAdd();
   the pack builders turn every registered scene into its opening item. A festival or the birthday
   (priority 2+) still wins the day. Guide: docs/dev/ASIA_PACK.md. Gate: tests/anim-packs.test.mjs,
   tests/asia-pack.test.mjs, tests/region-framework.test.mjs.
   ============================================================ */
/** Asian countries and territories: code -> [name, group]. Groups: west, central (with Asian Russia), south, east, southeast. */
const ASIA_COUNTRIES = {
  TR: ['Turkey', 'west'], CY: ['Cyprus', 'west'], GE: ['Georgia', 'west'], AM: ['Armenia', 'west'], AZ: ['Azerbaijan', 'west'], LB: ['Lebanon', 'west'],
  SY: ['Syria', 'west'], IL: ['Israel', 'west'], PS: ['Palestine', 'west'], JO: ['Jordan', 'west'], IQ: ['Iraq', 'west'], IR: ['Iran', 'west'],
  SA: ['Saudi Arabia', 'west'], YE: ['Yemen', 'west'], OM: ['Oman', 'west'], AE: ['United Arab Emirates', 'west'], QA: ['Qatar', 'west'], BH: ['Bahrain', 'west'], KW: ['Kuwait', 'west'],
  KZ: ['Kazakhstan', 'central'], UZ: ['Uzbekistan', 'central'], TM: ['Turkmenistan', 'central'], TJ: ['Tajikistan', 'central'], KG: ['Kyrgyzstan', 'central'], RU: ['Russia (Siberia and the Far East)', 'central'],
  IN: ['India', 'south'], PK: ['Pakistan', 'south'], BD: ['Bangladesh', 'south'], LK: ['Sri Lanka', 'south'], NP: ['Nepal', 'south'], BT: ['Bhutan', 'south'], MV: ['Maldives', 'south'], AF: ['Afghanistan', 'south'],
  CN: ['China', 'east'], JP: ['Japan', 'east'], KR: ['South Korea', 'east'], KP: ['North Korea', 'east'], MN: ['Mongolia', 'east'], TW: ['Taiwan', 'east'], HK: ['Hong Kong', 'east'], MO: ['Macau', 'east'],
  ID: ['Indonesia', 'southeast'], MY: ['Malaysia', 'southeast'], SG: ['Singapore', 'southeast'], TH: ['Thailand', 'southeast'], VN: ['Vietnam', 'southeast'], PH: ['Philippines', 'southeast'],
  MM: ['Myanmar', 'southeast'], KH: ['Cambodia', 'southeast'], LA: ['Laos', 'southeast'], BN: ['Brunei', 'southeast'], TL: ['Timor-Leste', 'southeast'],
};
/**
 * Places: [id, name, country, lat, lon, kind]. kind 'big' (a major city: a full-screen signature opening), 'small' (a smaller city,
 * town or famous place: a small element for the symbol slot) or '' (an anchor: only tells which country a position is in).
 * The id plus '-' plus the lower-case country code is the travel city id.
 */
const ASIA_PLACES = [
  // West Asia
  ['istanbul', 'Istanbul', 'TR', 41.01, 28.98, 'big'], ['ankara', 'Ankara', 'TR', 39.93, 32.86, ''], ['izmir', 'Izmir', 'TR', 38.42, 27.14, ''], ['goreme', 'Goreme', 'TR', 38.64, 34.83, 'small'],
  ['antalya', 'Antalya', 'TR', 36.9, 30.7, ''], ['trabzon', 'Trabzon', 'TR', 41.0, 39.72, ''], ['diyarbakir', 'Diyarbakir', 'TR', 37.91, 40.24, ''], ['van', 'Van', 'TR', 38.49, 43.38, ''],
  ['nicosia', 'Nicosia', 'CY', 35.17, 33.36, ''], ['paphos', 'Paphos', 'CY', 34.77, 32.42, 'small'], ['tbilisi', 'Tbilisi', 'GE', 41.72, 44.79, 'big'], ['batumi', 'Batumi', 'GE', 41.64, 41.64, ''],
  ['yerevan', 'Yerevan', 'AM', 40.18, 44.51, 'big'], ['gyumri', 'Gyumri', 'AM', 40.79, 43.85, ''], ['baku', 'Baku', 'AZ', 40.41, 49.87, 'big'], ['ganja', 'Ganja', 'AZ', 40.68, 46.36, ''],
  ['beirut', 'Beirut', 'LB', 33.89, 35.5, 'big'], ['tripoli-lb', 'Tripoli', 'LB', 34.44, 35.84, ''], ['damascus', 'Damascus', 'SY', 33.51, 36.29, 'big'], ['aleppo', 'Aleppo', 'SY', 36.2, 37.13, ''],
  ['palmyra', 'Palmyra', 'SY', 34.55, 38.27, 'small'], ['jerusalem', 'Jerusalem', 'IL', 31.77, 35.21, 'big'], ['tel-aviv', 'Tel Aviv', 'IL', 32.09, 34.78, 'big'], ['haifa', 'Haifa', 'IL', 32.79, 34.99, ''],
  ['eilat', 'Eilat', 'IL', 29.56, 34.95, ''], ['ramallah', 'Ramallah', 'PS', 31.9, 35.2, ''], ['gaza', 'Gaza', 'PS', 31.5, 34.47, ''], ['bethlehem', 'Bethlehem', 'PS', 31.7, 35.2, 'small'],
  ['amman', 'Amman', 'JO', 31.95, 35.93, 'big'], ['petra', 'Petra', 'JO', 30.33, 35.44, 'small'], ['aqaba', 'Aqaba', 'JO', 29.53, 35.0, ''], ['baghdad', 'Baghdad', 'IQ', 33.31, 44.37, 'big'],
  ['erbil', 'Erbil', 'IQ', 36.19, 44.01, ''], ['basra', 'Basra', 'IQ', 30.51, 47.78, ''], ['mosul', 'Mosul', 'IQ', 36.34, 43.13, ''], ['tehran', 'Tehran', 'IR', 35.69, 51.39, 'big'],
  ['isfahan', 'Isfahan', 'IR', 32.65, 51.67, 'small'], ['shiraz', 'Shiraz', 'IR', 29.59, 52.58, 'small'], ['mashhad', 'Mashhad', 'IR', 36.3, 59.6, ''], ['tabriz', 'Tabriz', 'IR', 38.08, 46.29, ''],
  ['ahvaz', 'Ahvaz', 'IR', 31.32, 48.67, ''], ['bandar-abbas', 'Bandar Abbas', 'IR', 27.18, 56.27, ''], ['zahedan', 'Zahedan', 'IR', 29.5, 60.86, ''], ['riyadh', 'Riyadh', 'SA', 24.71, 46.68, 'big'],
  ['jeddah', 'Jeddah', 'SA', 21.54, 39.17, 'big'], ['mecca', 'Mecca', 'SA', 21.39, 39.86, ''], ['medina', 'Medina', 'SA', 24.47, 39.61, ''], ['dammam', 'Dammam', 'SA', 26.43, 50.1, ''],
  ['abha', 'Abha', 'SA', 18.22, 42.5, ''], ['tabuk', 'Tabuk', 'SA', 28.38, 36.57, ''], ['alula', 'AlUla', 'SA', 26.61, 37.92, 'small'], ['sanaa', 'Sanaa', 'YE', 15.37, 44.19, ''],
  ['aden', 'Aden', 'YE', 12.79, 45.03, ''], ['socotra', 'Socotra', 'YE', 12.5, 53.82, 'small'], ['muscat', 'Muscat', 'OM', 23.59, 58.41, 'big'], ['salalah', 'Salalah', 'OM', 17.02, 54.09, ''],
  ['nizwa', 'Nizwa', 'OM', 22.93, 57.53, 'small'], ['dubai', 'Dubai', 'AE', 25.2, 55.27, 'big'], ['abu-dhabi', 'Abu Dhabi', 'AE', 24.45, 54.38, 'big'], ['al-ain', 'Al Ain', 'AE', 24.21, 55.76, ''],
  ['doha', 'Doha', 'QA', 25.29, 51.53, 'big'], ['manama', 'Manama', 'BH', 26.23, 50.59, ''], ['kuwait-city', 'Kuwait City', 'KW', 29.38, 47.99, 'big'],
  // Central Asia and Asian Russia
  ['almaty', 'Almaty', 'KZ', 43.24, 76.89, 'big'], ['astana', 'Astana', 'KZ', 51.17, 71.43, 'big'], ['shymkent', 'Shymkent', 'KZ', 42.32, 69.59, ''], ['aktau', 'Aktau', 'KZ', 43.65, 51.15, ''],
  ['oral', 'Oral', 'KZ', 51.23, 51.37, ''], ['ust-kamenogorsk', 'Oskemen', 'KZ', 49.95, 82.61, ''], ['baikonur', 'Baikonur', 'KZ', 45.96, 63.31, 'small'], ['tashkent', 'Tashkent', 'UZ', 41.3, 69.24, 'big'],
  ['samarkand', 'Samarkand', 'UZ', 39.65, 66.96, 'small'], ['bukhara', 'Bukhara', 'UZ', 39.77, 64.42, 'small'], ['khiva', 'Khiva', 'UZ', 41.38, 60.36, ''], ['nukus', 'Nukus', 'UZ', 42.46, 59.61, ''],
  ['ashgabat', 'Ashgabat', 'TM', 37.95, 58.38, 'big'], ['mary', 'Mary', 'TM', 37.6, 61.83, ''], ['turkmenbashi', 'Turkmenbashi', 'TM', 40.02, 52.97, ''], ['darvaza', 'Darvaza', 'TM', 40.25, 58.44, 'small'],
  ['dushanbe', 'Dushanbe', 'TJ', 38.56, 68.77, ''], ['khujand', 'Khujand', 'TJ', 40.28, 69.62, ''], ['khorog', 'Khorog', 'TJ', 37.49, 71.55, ''], ['bishkek', 'Bishkek', 'KG', 42.87, 74.59, ''],
  ['osh', 'Osh', 'KG', 40.53, 72.8, ''], ['karakol', 'Karakol', 'KG', 42.49, 78.39, 'small'], ['naryn', 'Naryn', 'KG', 41.43, 75.99, ''],
  ['novosibirsk', 'Novosibirsk', 'RU', 55.03, 82.92, 'big'], ['vladivostok', 'Vladivostok', 'RU', 43.12, 131.89, 'big'], ['yekaterinburg', 'Yekaterinburg', 'RU', 56.84, 60.6, 'big'], ['irkutsk', 'Irkutsk', 'RU', 52.29, 104.3, 'small'],
  ['krasnoyarsk', 'Krasnoyarsk', 'RU', 56.01, 92.85, ''], ['yakutsk', 'Yakutsk', 'RU', 62.03, 129.73, ''], ['omsk', 'Omsk', 'RU', 54.99, 73.37, ''], ['khabarovsk', 'Khabarovsk', 'RU', 48.48, 135.08, ''],
  ['tyumen', 'Tyumen', 'RU', 57.15, 65.53, ''], ['chita', 'Chita', 'RU', 52.03, 113.5, ''], ['petropavlovsk', 'Petropavlovsk-Kamchatsky', 'RU', 53.04, 158.65, ''],
  // South Asia
  ['mumbai', 'Mumbai', 'IN', 19.08, 72.88, 'big'], ['delhi', 'Delhi', 'IN', 28.61, 77.21, 'big'], ['bengaluru', 'Bengaluru', 'IN', 12.97, 77.59, 'big'], ['kolkata', 'Kolkata', 'IN', 22.57, 88.36, 'big'],
  ['chennai', 'Chennai', 'IN', 13.08, 80.27, 'big'], ['hyderabad', 'Hyderabad', 'IN', 17.39, 78.49, 'big'], ['ahmedabad', 'Ahmedabad', 'IN', 23.02, 72.57, ''], ['pune', 'Pune', 'IN', 18.52, 73.86, ''],
  ['jaipur', 'Jaipur', 'IN', 26.91, 75.79, 'small'], ['agra', 'Agra', 'IN', 27.18, 78.02, 'small'], ['varanasi', 'Varanasi', 'IN', 25.32, 83.0, 'small'], ['panaji', 'Panaji (Goa)', 'IN', 15.5, 73.83, 'small'],
  ['kochi', 'Kochi', 'IN', 9.93, 76.27, 'small'], ['amritsar', 'Amritsar', 'IN', 31.63, 74.87, 'small'], ['leh', 'Leh', 'IN', 34.15, 77.58, 'small'], ['srinagar', 'Srinagar', 'IN', 34.08, 74.8, ''],
  ['guwahati', 'Guwahati', 'IN', 26.14, 91.74, ''], ['lucknow', 'Lucknow', 'IN', 26.85, 80.95, ''], ['bhopal', 'Bhopal', 'IN', 23.26, 77.41, ''], ['nagpur', 'Nagpur', 'IN', 21.15, 79.09, ''],
  ['patna', 'Patna', 'IN', 25.59, 85.14, ''], ['darjeeling', 'Darjeeling', 'IN', 27.04, 88.26, 'small'], ['jodhpur', 'Jodhpur', 'IN', 26.24, 73.02, ''], ['thiruvananthapuram', 'Thiruvananthapuram', 'IN', 8.52, 76.94, ''],
  ['port-blair', 'Port Blair', 'IN', 11.62, 92.73, ''], ['karachi', 'Karachi', 'PK', 24.86, 67.0, 'big'], ['lahore', 'Lahore', 'PK', 31.55, 74.34, 'big'], ['islamabad', 'Islamabad', 'PK', 33.68, 73.05, 'big'],
  ['peshawar', 'Peshawar', 'PK', 34.0, 71.58, ''], ['quetta', 'Quetta', 'PK', 30.18, 66.99, ''], ['hunza', 'Hunza', 'PK', 36.32, 74.65, 'small'], ['multan', 'Multan', 'PK', 30.2, 71.47, ''],
  ['dhaka', 'Dhaka', 'BD', 23.81, 90.41, 'big'], ['chittagong', 'Chittagong', 'BD', 22.36, 91.78, ''], ['coxs-bazar', "Cox's Bazar", 'BD', 21.43, 92.0, 'small'], ['khulna', 'Khulna', 'BD', 22.82, 89.55, ''],
  ['colombo', 'Colombo', 'LK', 6.93, 79.86, 'big'], ['kandy', 'Kandy', 'LK', 7.29, 80.63, 'small'], ['galle', 'Galle', 'LK', 6.03, 80.22, 'small'], ['jaffna', 'Jaffna', 'LK', 9.66, 80.02, ''],
  ['kathmandu', 'Kathmandu', 'NP', 27.72, 85.32, 'big'], ['pokhara', 'Pokhara', 'NP', 28.21, 83.99, 'small'], ['biratnagar', 'Biratnagar', 'NP', 26.45, 87.27, ''], ['thimphu', 'Thimphu', 'BT', 27.47, 89.64, 'big'],
  ['paro', 'Paro', 'BT', 27.43, 89.41, 'small'], ['male', 'Male', 'MV', 4.18, 73.51, 'big'], ['addu', 'Addu City', 'MV', -0.63, 73.15, ''], ['kabul', 'Kabul', 'AF', 34.53, 69.17, 'big'],
  ['kandahar', 'Kandahar', 'AF', 31.61, 65.71, ''], ['herat', 'Herat', 'AF', 34.34, 62.2, ''], ['mazar-i-sharif', 'Mazar-i-Sharif', 'AF', 36.71, 67.11, ''], ['bamiyan', 'Bamiyan', 'AF', 34.82, 67.82, 'small'],
  // East Asia
  ['beijing', 'Beijing', 'CN', 39.9, 116.4, 'big'], ['shanghai', 'Shanghai', 'CN', 31.23, 121.47, 'big'], ['guangzhou', 'Guangzhou', 'CN', 23.13, 113.26, 'big'], ['shenzhen', 'Shenzhen', 'CN', 22.54, 114.06, 'big'],
  ['chengdu', 'Chengdu', 'CN', 30.57, 104.07, 'big'], ['chongqing', 'Chongqing', 'CN', 29.56, 106.55, 'big'], ['wuhan', 'Wuhan', 'CN', 30.59, 114.31, 'big'], ['xian', "Xi'an", 'CN', 34.34, 108.94, 'big'],
  ['hangzhou', 'Hangzhou', 'CN', 30.27, 120.16, 'big'], ['tianjin', 'Tianjin', 'CN', 39.34, 117.36, 'big'], ['nanjing', 'Nanjing', 'CN', 32.06, 118.8, 'big'], ['harbin', 'Harbin', 'CN', 45.8, 126.53, 'small'],
  ['kunming', 'Kunming', 'CN', 25.04, 102.72, 'small'], ['guilin', 'Guilin', 'CN', 25.27, 110.29, 'small'], ['lhasa', 'Lhasa', 'CN', 29.65, 91.17, 'small'], ['urumqi', 'Urumqi', 'CN', 43.83, 87.62, ''],
  ['lanzhou', 'Lanzhou', 'CN', 36.06, 103.83, ''], ['shenyang', 'Shenyang', 'CN', 41.8, 123.43, ''], ['hohhot', 'Hohhot', 'CN', 40.84, 111.75, ''], ['xiamen', 'Xiamen', 'CN', 24.48, 118.09, ''],
  ['qingdao', 'Qingdao', 'CN', 36.07, 120.38, 'small'], ['lijiang', 'Lijiang', 'CN', 26.87, 100.23, 'small'], ['dunhuang', 'Dunhuang', 'CN', 40.14, 94.66, 'small'], ['kashgar', 'Kashgar', 'CN', 39.47, 75.99, 'small'],
  ['changsha', 'Changsha', 'CN', 28.23, 112.94, ''], ['zhengzhou', 'Zhengzhou', 'CN', 34.75, 113.62, ''], ['jinan', 'Jinan', 'CN', 36.65, 117.0, ''], ['taiyuan', 'Taiyuan', 'CN', 37.87, 112.55, ''],
  ['nanning', 'Nanning', 'CN', 22.82, 108.32, ''], ['haikou', 'Haikou', 'CN', 20.04, 110.2, ''], ['guiyang', 'Guiyang', 'CN', 26.65, 106.63, ''], ['hefei', 'Hefei', 'CN', 31.82, 117.23, ''],
  ['nanchang', 'Nanchang', 'CN', 28.68, 115.86, ''], ['fuzhou', 'Fuzhou', 'CN', 26.07, 119.3, ''], ['suzhou', 'Suzhou', 'CN', 31.3, 120.58, 'small'], ['changchun', 'Changchun', 'CN', 43.88, 125.32, ''],
  ['yinchuan', 'Yinchuan', 'CN', 38.49, 106.23, ''], ['xining', 'Xining', 'CN', 36.62, 101.78, ''], ['tokyo', 'Tokyo', 'JP', 35.68, 139.69, 'big'], ['osaka', 'Osaka', 'JP', 34.69, 135.5, 'big'],
  ['sapporo', 'Sapporo', 'JP', 43.06, 141.35, 'big'], ['fukuoka', 'Fukuoka', 'JP', 33.59, 130.4, 'big'], ['kyoto', 'Kyoto', 'JP', 35.01, 135.77, 'small'], ['nagoya', 'Nagoya', 'JP', 35.18, 136.91, ''],
  ['yokohama', 'Yokohama', 'JP', 35.44, 139.64, ''], ['hiroshima', 'Hiroshima', 'JP', 34.39, 132.45, 'small'], ['nara', 'Nara', 'JP', 34.69, 135.8, 'small'], ['naha', 'Naha', 'JP', 26.21, 127.68, 'small'],
  ['sendai', 'Sendai', 'JP', 38.27, 140.87, ''], ['nagasaki', 'Nagasaki', 'JP', 32.75, 129.88, 'small'], ['kanazawa', 'Kanazawa', 'JP', 36.56, 136.66, ''], ['seoul', 'Seoul', 'KR', 37.57, 126.98, 'big'],
  ['busan', 'Busan', 'KR', 35.18, 129.08, 'big'], ['incheon', 'Incheon', 'KR', 37.46, 126.7, ''], ['daegu', 'Daegu', 'KR', 35.87, 128.6, ''], ['jeju', 'Jeju', 'KR', 33.5, 126.53, 'small'],
  ['gyeongju', 'Gyeongju', 'KR', 35.84, 129.21, 'small'], ['daejeon', 'Daejeon', 'KR', 36.35, 127.38, ''], ['gwangju', 'Gwangju', 'KR', 35.16, 126.85, ''], ['pyongyang', 'Pyongyang', 'KP', 39.04, 125.76, 'big'],
  ['hamhung', 'Hamhung', 'KP', 39.92, 127.54, ''], ['kaesong', 'Kaesong', 'KP', 37.97, 126.56, ''], ['ulaanbaatar', 'Ulaanbaatar', 'MN', 47.89, 106.91, 'big'], ['erdenet', 'Erdenet', 'MN', 49.03, 104.05, ''],
  ['khovd', 'Khovd', 'MN', 48.0, 91.64, ''], ['dalanzadgad', 'Dalanzadgad', 'MN', 43.57, 104.42, 'small'], ['taipei', 'Taipei', 'TW', 25.03, 121.57, 'big'], ['kaohsiung', 'Kaohsiung', 'TW', 22.63, 120.3, 'big'],
  ['taichung', 'Taichung', 'TW', 24.15, 120.67, ''], ['tainan', 'Tainan', 'TW', 22.99, 120.21, 'small'], ['hualien', 'Hualien', 'TW', 23.99, 121.6, 'small'], ['hong-kong', 'Hong Kong', 'HK', 22.32, 114.17, 'big'],
  ['macau', 'Macau', 'MO', 22.2, 113.54, 'big'],
  // Southeast Asia
  ['jakarta', 'Jakarta', 'ID', -6.21, 106.85, 'big'], ['surabaya', 'Surabaya', 'ID', -7.25, 112.75, 'big'], ['bandung', 'Bandung', 'ID', -6.92, 107.61, ''], ['medan', 'Medan', 'ID', 3.6, 98.67, ''],
  ['denpasar', 'Denpasar (Bali)', 'ID', -8.65, 115.22, 'small'], ['yogyakarta', 'Yogyakarta', 'ID', -7.8, 110.36, 'small'], ['makassar', 'Makassar', 'ID', -5.15, 119.43, ''], ['palembang', 'Palembang', 'ID', -2.98, 104.76, ''],
  ['balikpapan', 'Balikpapan', 'ID', -1.24, 116.83, ''], ['jayapura', 'Jayapura', 'ID', -2.53, 140.7, ''], ['banda-aceh', 'Banda Aceh', 'ID', 5.55, 95.32, ''], ['labuan-bajo', 'Labuan Bajo', 'ID', -8.5, 119.88, 'small'],
  ['pontianak', 'Pontianak', 'ID', -0.03, 109.33, ''], ['manado', 'Manado', 'ID', 1.49, 124.84, ''], ['mataram', 'Mataram', 'ID', -8.58, 116.12, ''], ['kupang', 'Kupang', 'ID', -10.18, 123.6, ''],
  ['ambon', 'Ambon', 'ID', -3.7, 128.18, ''], ['kuala-lumpur', 'Kuala Lumpur', 'MY', 3.14, 101.69, 'big'], ['george-town', 'George Town', 'MY', 5.41, 100.34, 'small'], ['kota-kinabalu', 'Kota Kinabalu', 'MY', 5.98, 116.07, 'small'],
  ['kuching', 'Kuching', 'MY', 1.55, 110.36, 'small'], ['johor-bahru', 'Johor Bahru', 'MY', 1.49, 103.74, ''], ['ipoh', 'Ipoh', 'MY', 4.6, 101.08, ''], ['malacca', 'Malacca', 'MY', 2.2, 102.25, 'small'],
  ['langkawi', 'Langkawi', 'MY', 6.35, 99.8, 'small'], ['kuantan', 'Kuantan', 'MY', 3.81, 103.33, ''], ['singapore', 'Singapore', 'SG', 1.35, 103.82, 'big'], ['bangkok', 'Bangkok', 'TH', 13.76, 100.5, 'big'],
  ['chiang-mai', 'Chiang Mai', 'TH', 18.79, 98.98, 'small'], ['phuket', 'Phuket', 'TH', 7.88, 98.39, 'small'], ['pattaya', 'Pattaya', 'TH', 12.93, 100.88, ''], ['ayutthaya', 'Ayutthaya', 'TH', 14.35, 100.57, 'small'],
  ['hat-yai', 'Hat Yai', 'TH', 7.0, 100.47, ''], ['khon-kaen', 'Khon Kaen', 'TH', 16.44, 102.83, ''], ['chiang-rai', 'Chiang Rai', 'TH', 19.91, 99.83, ''], ['ho-chi-minh-city', 'Ho Chi Minh City', 'VN', 10.82, 106.63, 'big'],
  ['hanoi', 'Hanoi', 'VN', 21.03, 105.85, 'big'], ['da-nang', 'Da Nang', 'VN', 16.05, 108.2, 'big'], ['hoi-an', 'Hoi An', 'VN', 15.88, 108.33, 'small'], ['hue', 'Hue', 'VN', 16.46, 107.6, 'small'],
  ['ha-long', 'Ha Long', 'VN', 20.95, 107.08, 'small'], ['hai-phong', 'Hai Phong', 'VN', 20.84, 106.69, ''], ['can-tho', 'Can Tho', 'VN', 10.04, 105.78, ''], ['nha-trang', 'Nha Trang', 'VN', 12.24, 109.2, ''],
  ['sapa', 'Sapa', 'VN', 22.34, 103.84, 'small'], ['manila', 'Manila', 'PH', 14.6, 120.98, 'big'], ['cebu', 'Cebu', 'PH', 10.32, 123.89, 'big'], ['davao', 'Davao', 'PH', 7.19, 125.46, 'big'],
  ['baguio', 'Baguio', 'PH', 16.4, 120.6, ''], ['puerto-princesa', 'Puerto Princesa', 'PH', 9.74, 118.74, 'small'], ['boracay', 'Boracay', 'PH', 11.97, 121.92, 'small'], ['vigan', 'Vigan', 'PH', 17.57, 120.39, 'small'],
  ['zamboanga', 'Zamboanga', 'PH', 6.92, 122.08, ''], ['tacloban', 'Tacloban', 'PH', 11.24, 125.0, ''], ['yangon', 'Yangon', 'MM', 16.87, 96.2, 'big'], ['mandalay', 'Mandalay', 'MM', 21.97, 96.08, 'big'],
  ['naypyidaw', 'Naypyidaw', 'MM', 19.76, 96.08, ''], ['bagan', 'Bagan', 'MM', 21.17, 94.86, 'small'], ['inle-lake', 'Inle Lake', 'MM', 20.55, 96.9, 'small'], ['myitkyina', 'Myitkyina', 'MM', 25.38, 97.4, ''],
  ['sittwe', 'Sittwe', 'MM', 20.15, 92.9, ''], ['dawei', 'Dawei', 'MM', 14.08, 98.2, ''], ['phnom-penh', 'Phnom Penh', 'KH', 11.56, 104.92, 'big'], ['siem-reap', 'Siem Reap', 'KH', 13.36, 103.86, 'small'],
  ['sihanoukville', 'Sihanoukville', 'KH', 10.63, 103.5, ''], ['battambang', 'Battambang', 'KH', 13.1, 103.2, ''], ['vientiane', 'Vientiane', 'LA', 17.97, 102.6, 'big'], ['luang-prabang', 'Luang Prabang', 'LA', 19.89, 102.13, 'small'],
  ['pakse', 'Pakse', 'LA', 15.12, 105.78, ''], ['savannakhet', 'Savannakhet', 'LA', 16.55, 104.75, ''], ['vang-vieng', 'Vang Vieng', 'LA', 18.92, 102.45, 'small'], ['bandar-seri-begawan', 'Bandar Seri Begawan', 'BN', 4.89, 114.94, 'big'],
  ['dili', 'Dili', 'TL', -8.56, 125.57, 'big'], ['baucau', 'Baucau', 'TL', -8.47, 126.46, ''],
];
/** Cities the world pack (72-anim-pack-world.js) draws for travellers: while travelling there the world pack owns the opening, and the arrival card. */
const ASIA_WORLD_TRAVEL = ['tokyo-jp', 'dubai-ae', 'singapore-sg'];
const ASIA_COUNTRY_KM = 300;                       // beyond this from every row the position is not in Asia (or is a country this table does not cover)
const ASIA_PLACE_KM = { big: 50, small: 30 };     // how close counts as "in" a city / a town

/** Asia as a region (71-anim-0region.js): the config is the whole definition, the functions below are its public names. */
const ASIA_REGION = animRegionDefine({
  id: 'asia', name: 'Asia', over: 'Asia', unitWord: 'country',
  units: ASIA_COUNTRIES, places: ASIA_PLACES, unitKm: ASIA_COUNTRY_KM, placeKm: ASIA_PLACE_KM,
  travelId: (p) => p[0] + '-' + p[2].toLowerCase(),   // 'tokyo-jp': the travel tables' ids
  worldTravel: ASIA_WORLD_TRAVEL,
  placeKinds: ['small'],                              // the big cities come from their scenes (B.scenes())
  keys: { unit: 'cc', unitName: 'countryName' }, fields: { unit: 'asiaCc' },
});
/** The art place (a big or small city) for a ctx, {id, name, cc, kind} or null. Travel wins. */
function asiaPlace(ctx) { return ASIA_REGION.place(ctx); }
/** The country code for a ctx ('' = not in Asia, or travelling somewhere that is not an Asian place). Nearest table row wins. */
function asiaCountryOf(ctx) { return ASIA_REGION.unitOf(ctx); }
/** For the page (the opening sequence): where in Asia, {id, name, cc, countryName, kind} or null. A town wins, else the country. */
function asiaWhere(ctx) { return ASIA_REGION.where(ctx); }
/**
 * Full-screen scenes (the openings): ASIA_SCENES['country:JP'] (a country's signature) or ASIA_SCENES['place:tokyo'] (a big city), filled by
 * src/app/71-anim-asia2-scenes-*.js through asiaSceneAdd(entry). An entry is {key, id?, label, site, colour, mood, season, tags, svg}; svg() returns
 * the inside of a 1600 x 900 drawing built with usSceneKit() (an alias of animSceneKit(), the shared full-scene toolkit in 71-anim-0region.js).
 */
const ASIA_SCENES = ASIA_REGION.scenes;
function asiaSceneAdd(e) { ASIA_REGION.sceneAdd(e); }
/**
 * A builder for an Asia pack file: const B = asiaBuilder('west');
 *   B.scenes()                      every registered scene of this group becomes a full-screen opening item (country signatures and big cities)
 *   B.element('JP', {id, label, ...})  the country's small symbol (slot symbol)
 *   B.place('kyoto', {...})         a small city's element (slot symbol); big cities come from their scene
 * Then animRegisterPack(B.pack({id, name, description})).
 */
function asiaBuilder(group) { return ASIA_REGION.builder(group); }
