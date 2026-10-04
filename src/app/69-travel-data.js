/* ============================================================
   TRAVEL DATA (generated: do not edit by hand). Owner: PLACES.
   Made by tools/build-travel-data.mjs (travel spec 3.4) from:
     - IANA tzdata zone.tab and backward links (public domain)
     - GeoNames cities15000 and countryInfo (CC BY 4.0, https://www.geonames.org/)
     - OurAirports airports (public domain, https://ourairports.com/)
     - hand-written facts: tools/travel-data-facts.mjs
   trPlaceTables() parses the strings once; TR_DATA gives the tables in the
   shape trPlaceIndexFromData (69-travel-logic.js) reads. Helpers: 69-travel-places.js.
   Raw rows are newline-separated, fields ';'-separated; base-36 numbers are
   indexes (zones, cities) or thousands of people; zone areas are packed
   (A Africa, M America, N Antarctica, R Arctic, S Asia, T Atlantic,
   U Australia, E Europe, I Indian, P Pacific).
     zones      zone;cc;lat;lon;city
     links      oldName>zone (names browsers and calendars still report)
     countries  cc;ccy;langs;plugs;L;emergency;weekend;kind;capital;flag
     cities     name;cc (when not the zone's);zone;lat;lon;pop;kind;lang;aliases
     airports   IATA + city
   ============================================================ */
const TR_DATA_RAW = {
  version: '2026-10-04',
  states: 'SG HK MO MC VA SM GI BH QA KW LU AD LI MT',
  zones: `A/Abidjan;CI;5.32;-4.03;1i
A/Accra;GH;5.55;-0.22;61
A/Addis_Ababa;ET;9.03;38.7;2k
A/Algiers;DZ;36.78;3.05;4r
A/Asmara;ER;15.33;38.88;hh
A/Bamako;ML;12.65;-8;2f
A/Bangui;CF;4.37;18.58;dq
A/Banjul;GM;13.47;-16.65;wp
A/Bissau;GW;11.85;-15.58;k7
A/Blantyre;MW;-15.78;35;cq
A/Brazzaville;CG;-4.27;15.28;5t
A/Bujumbura;BI;-3.38;29.37;e6
A/Cairo;EG;30.05;31.25;q
A/Casablanca;MA;33.65;-7.58;2t
A/Ceuta;ES;35.88;-5.32
A/Conakry;GN;9.52;-13.72;64
A/Dakar;SN;14.67;-17.43;4b
A/Dar_es_Salaam;TZ;-6.8;39.28;1q
A/Djibouti;DJ;11.6;43.15;g4
A/Douala;CM;4.05;9.7;9m
A/El_Aaiun;EH;27.15;-13.2
A/Freetown;SL;8.5;-13.25;du
A/Gaborone;BW;-24.65;25.92;pq
A/Harare;ZW;-17.83;31.05;8h
A/Johannesburg;ZA;-26.25;28;s
A/Juba;SS;4.85;31.62;k3
A/Kampala;UG;0.32;32.42;7i
A/Khartoum;SD;15.6;32.53;5x
A/Kigali;RW;-1.95;30.07;b2
A/Kinshasa;CD;-4.3;15.3;6
A/Lagos;NG;6.45;3.4;8
A/Libreville;GA;0.38;9.45;dc
A/Lome;TG;6.13;1.22;59
A/Luanda;AO;-8.8;13.23;3u
A/Lubumbashi;CD;-11.67;27.47;53
A/Lusaka;ZM;-15.42;28.28;55
A/Malabo;GQ;3.75;8.78
A/Maputo;MZ;-25.97;32.58;a6
A/Maseru;LS;-29.47;27.5;mb
A/Mbabane;SZ;-26.3;31.1;uk
A/Mogadishu;SO;2.07;45.37;4e
A/Monrovia;LR;6.3;-10.78;8i
A/Nairobi;KE;-1.28;36.82;2b
A/Ndjamena;TD;12.12;15.05;9j
A/Niamey;NE;13.52;2.12;9r
A/Nouakchott;MR;18.1;-15.95;ar
A/Ouagadougou;BF;12.37;-1.52;4l
A/Porto-Novo;BJ;6.48;2.62;pf
A/Sao_Tome;ST;0.33;6.73;vo
A/Tripoli;LY;32.9;13.18;9u
A/Tunis;TN;36.8;10.18;ev
A/Windhoek;NA;-22.57;17.1;li
M/Adak;US;51.88;-176.66
M/Anchorage;US;61.22;-149.9;ou
M/Anguilla;AI;18.2;-63.07;z7
M/Antigua;AG;17.05;-61.8;vu
M/Araguaina;BR;-7.2;-48.2
M/Argentina/Buenos_Aires;AR;-34.6;-58.45;3n
M/Argentina/Catamarca;AR;-28.47;-65.78
M/Argentina/Cordoba;AR;-31.4;-64.18;5j
M/Argentina/Jujuy;AR;-24.18;-65.3
M/Argentina/La_Rioja;AR;-29.43;-66.85
M/Argentina/Mendoza;AR;-32.88;-68.82;sw
M/Argentina/Rio_Gallegos;AR;-51.63;-69.22
M/Argentina/Salta;AR;-24.78;-65.42;ic
M/Argentina/San_Juan;AR;-31.53;-68.52
M/Argentina/San_Luis;AR;-33.32;-66.35
M/Argentina/Tucuman;AR;-26.82;-65.22;hq
M/Argentina/Ushuaia;AR;-54.8;-68.3;vd
M/Aruba;AW;12.5;-69.97;x7
M/Asuncion;PY;-25.27;-57.67;8y
M/Atikokan;CA;48.76;-91.62
M/Bahia;BR;-12.98;-38.52;45
M/Bahia_Banderas;MX;20.8;-105.25;q2
M/Barbados;BB;13.1;-59.62;th
M/Belem;BR;-1.45;-48.48;8u
M/Belize;BZ;17.5;-88.2;v3
M/Blanc-Sablon;CA;51.42;-57.12
M/Boa_Vista;BR;2.82;-60.67
M/Bogota;CO;4.6;-74.08;15
M/Boise;US;43.61;-116.2
M/Cambridge_Bay;CA;69.11;-105.05
M/Campo_Grande;BR;-20.45;-54.62
M/Cancun;MX;21.08;-86.77;cw
M/Caracas;VE;10.5;-66.93;3j
M/Cayenne;GF;4.93;-52.33;v8
M/Cayman;KY;19.3;-81.38;x8
M/Chicago;US;41.85;-87.65;48
M/Chihuahua;MX;28.63;-106.08;cg
M/Ciudad_Juarez;MX;31.73;-106.48;8q
M/Costa_Rica;CR;9.93;-84.08;n7
M/Coyhaique;CL;-45.57;-72.07
M/Creston;CA;49.1;-116.52
M/Cuiaba;BR;-15.58;-56.08
M/Curacao;CW;12.18;-69;sg
M/Danmarkshavn;GL;76.77;-18.67
M/Dawson;CA;64.07;-139.42
M/Dawson_Creek;CA;55.77;-120.23
M/Denver;US;39.74;-104.98;ei
M/Detroit;US;42.33;-83.05;fq
M/Dominica;DM;15.3;-61.4;yh
M/Edmonton;CA;53.55;-113.47;c0
M/Eirunepe;BR;-6.67;-69.87
M/El_Salvador;SV;13.7;-89.2;i7
M/Fort_Nelson;CA;58.8;-122.7
M/Fortaleza;BR;-3.72;-38.5;4n
M/Glace_Bay;CA;46.2;-59.95
M/Goose_Bay;CA;53.33;-60.42
M/Grand_Turk;TC;21.47;-71.13;z4
M/Grenada;GD;12.05;-61.75;yv
M/Guadeloupe;GP;16.23;-61.53
M/Guatemala;GT;14.63;-90.52;c4
M/Guayaquil;EC;-2.17;-79.83;41
M/Guyana;GY;6.8;-58.17;py
M/Halifax;CA;44.65;-63.6;jg
M/Havana;CU;23.13;-82.37;5b
M/Hermosillo;MX;29.07;-110.97;dr
M/Indiana/Indianapolis;US;39.77;-86.16
M/Indiana/Knox;US;41.3;-86.62
M/Indiana/Marengo;US;38.38;-86.34
M/Indiana/Petersburg;US;38.49;-87.28
M/Indiana/Tell_City;US;37.95;-86.76
M/Indiana/Vevay;US;38.75;-85.07
M/Indiana/Vincennes;US;38.68;-87.53
M/Indiana/Winamac;US;41.05;-86.6
M/Inuvik;CA;68.35;-133.72
M/Iqaluit;CA;63.73;-68.47
M/Jamaica;JM;17.97;-76.79;cf
M/Juneau;US;58.3;-134.42
M/Kentucky/Louisville;US;38.25;-85.76
M/Kentucky/Monticello;US;36.83;-84.85
M/Kralendijk;BQ;12.15;-68.28;yt
M/La_Paz;BO;-16.5;-68.15;5o
M/Lima;PE;-12.05;-77.05;14
M/Los_Angeles;US;34.05;-118.24;2o
M/Lower_Princes;SX;18.05;-63.05;z9
M/Maceio;BR;-9.67;-35.72
M/Managua;NI;12.15;-86.28;c8
M/Manaus;BR;-3.13;-60.02;54
M/Marigot;MF;18.07;-63.08;z1
M/Martinique;MQ;14.6;-61.08;tu
M/Matamoros;MX;25.83;-97.5
M/Mazatlan;MX;23.22;-106.42
M/Menominee;US;45.11;-87.61
M/Merida;MX;20.97;-89.62;ak
M/Metlakatla;US;55.13;-131.58
M/Mexico_City;MX;19.4;-99.15;g
M/Miquelon;PM;47.05;-56.33
M/Moncton;CA;46.1;-64.78
M/Monterrey;MX;25.67;-100.32
M/Montevideo;UY;-34.91;-56.21;a4
M/Montserrat;MS;16.72;-62.22;zn
M/Nassau;BS;25.08;-77.35;q0
M/New_York;US;40.71;-74.01;y
M/Nome;US;64.5;-165.41
M/Noronha;BR;-3.85;-32.42
M/North_Dakota/Beulah;US;47.26;-101.78
M/North_Dakota/Center;US;47.12;-101.3
M/North_Dakota/New_Salem;US;46.85;-101.41
M/Nuuk;GL;64.18;-51.73;yl
M/Ojinaga;MX;29.57;-104.42
M/Panama;PA;8.97;-79.53;kx
M/Paramaribo;SR;5.83;-55.17;q4
M/Phoenix;US;33.45;-112.07;7m
M/Port-au-Prince;HT;18.53;-72.33;ac
M/Port_of_Spain;TT;10.65;-61.52;w1
M/Porto_Velho;BR;-8.77;-63.9
M/Puerto_Rico;PR;18.47;-66.11;ks
M/Punta_Arenas;CL;-53.15;-70.92;ss
M/Rankin_Inlet;CA;62.82;-92.08
M/Recife;BR;-8.05;-34.9;7l
M/Regina;CA;50.4;-104.65
M/Resolute;CA;74.7;-94.83
M/Rio_Branco;BR;-9.97;-67.8
M/Santarem;BR;-2.43;-54.87
M/Santiago;CL;-33.45;-70.67;1w
M/Santo_Domingo;DO;18.47;-69.9;58
M/Sao_Paulo;BR;-23.53;-46.62;f
M/Scoresbysund;GL;70.48;-21.97
M/Sitka;US;57.18;-135.3
M/St_Barthelemy;BL;17.88;-62.85;z0
M/St_Johns;CA;47.57;-52.72;sz
M/St_Kitts;KN;17.3;-62.72;yp
M/St_Lucia;LC;14.02;-61;y5
M/St_Thomas;VI;18.35;-64.93;y6
M/St_Vincent;VC;13.15;-61.23;xr
M/Swift_Current;CA;50.28;-107.83
M/Tegucigalpa;HN;14.1;-87.22;d8
M/Thule;GL;76.57;-68.78
M/Tijuana;MX;32.53;-117.02;66
M/Toronto;CA;43.65;-79.38;3r
M/Tortola;VG;18.45;-64.62;yu
M/Vancouver;CA;49.27;-123.12;fd
M/Whitehorse;CA;60.72;-135.05
M/Winnipeg;CA;49.88;-97.15;eb
M/Yakutat;US;59.55;-139.73
N/Casey;AQ;-66.28;110.52
N/Davis;AQ;-68.58;77.97
N/DumontDUrville;AQ;-66.67;140.02
N/Macquarie;AU;-54.5;158.95
N/Mawson;AQ;-67.6;62.88
N/McMurdo;AQ;-77.83;166.6
N/Palmer;AQ;-64.8;-64.1
N/Rothera;AQ;-67.57;-68.13
N/Syowa;AQ;-69.01;39.59
N/Troll;AQ;-72.01;2.53
N/Vostok;AQ;-78.4;106.9
R/Longyearbyen;SJ;78;16;z5
S/Aden;YE;12.75;45.2;be
S/Almaty;KZ;43.25;76.95;5w
S/Amman;JO;31.95;35.93;9z
S/Anadyr;RU;64.75;177.48
S/Aqtau;KZ;44.52;50.27
S/Aqtobe;KZ;50.28;57.17;ir
S/Ashgabat;TM;37.95;58.38;bt
S/Atyrau;KZ;47.12;51.93
S/Baghdad;IQ;33.35;44.42;18
S/Bahrain;BH;26.38;50.58;rs
S/Baku;AZ;40.38;49.85;4t
S/Bangkok;TH;13.75;100.52;1u
S/Barnaul;RU;53.37;83.75
S/Beirut;LB;33.88;35.5;68
S/Bishkek;KG;42.9;74.6;cu
S/Brunei;BN;4.93;114.92;v5
S/Chita;RU;52.05;113.47
S/Colombo;LK;6.93;79.85;fo
S/Damascus;SY;33.5;36.3;88
S/Dhaka;BD;23.72;90.42;l
S/Dili;TL;-8.55;125.58;rl
S/Dubai;AE;25.3;55.3;2q
S/Dushanbe;TJ;38.58;68.8;f2
S/Famagusta;CY;35.12;33.95;zs
S/Gaza;PS;31.5;34.47;kw
S/Hebron;PS;31.53;35.1;x9
S/Ho_Chi_Minh;VN;10.75;106.67;9
S/Hong_Kong;HK;22.28;114.15;17
S/Hovd;MN;48.02;91.65
S/Irkutsk;RU;52.27;104.33
S/Jakarta;ID;-6.17;106.8;z
S/Jayapura;ID;-2.53;140.7
S/Jerusalem;IL;31.78;35.22;c9
S/Kabul;AF;34.52;69.2;2a
S/Kamchatka;RU;53.02;158.65
S/Karachi;PK;24.87;67.05;i
S/Kathmandu;NP;27.72;85.32;96
S/Khandyga;RU;62.66;135.55
S/Kolkata;IN;22.53;88.37;22
S/Krasnoyarsk;RU;56.02;92.83;bb
S/Kuala_Lumpur;MY;3.17;101.7;93
S/Kuching;MY;1.55;110.33;l0
S/Kuwait;KW;29.33;47.98;vc
S/Macau;MO;22.2;113.54;fm
S/Magadan;RU;59.57;150.8
S/Makassar;ID;-5.12;119.4;90
S/Manila;PH;14.59;120.97;7z
S/Muscat;OM;23.6;58.58;dw
S/Nicosia;CY;35.17;33.37;qm
S/Novokuznetsk;RU;53.75;87.12
S/Novosibirsk;RU;55.03;82.92;7t
S/Omsk;RU;55;73.4;as
S/Oral;KZ;51.22;51.35;ng
S/Phnom_Penh;KH;11.55;104.92;86
S/Pontianak;ID;-0.03;109.33
S/Pyongyang;KP;39.02;125.75;38
S/Qatar;QA;25.28;51.53;n0
S/Qostanay;KZ;53.2;63.62
S/Qyzylorda;KZ;44.8;65.47;mh
S/Riyadh;SA;24.63;46.72;2g
S/Sakhalin;RU;46.97;142.7
S/Samarkand;UZ;39.67;66.8;gn
S/Seoul;KR;37.55;126.97;m
S/Shanghai;CN;31.23;121.47;0
S/Singapore;SG;1.28;103.85;1o
S/Srednekolymsk;RU;67.47;153.72
S/Taipei;TW;25.05;121.5;13
S/Tashkent;UZ;41.33;69.3;5u
S/Tbilisi;GE;41.72;44.82;bk
S/Tehran;IR;35.67;51.43;1b
S/Thimphu;BT;27.47;89.65;tg
S/Tokyo;JP;35.65;139.74;o
S/Tomsk;RU;56.5;84.97
S/Ulaanbaatar;MN;47.92;106.88;dd
S/Urumqi;CN;43.8;87.58;2i
S/Ust-Nera;RU;64.56;143.23
S/Vientiane;LA;17.97;102.6;dh
S/Vladivostok;RU;43.17;131.93;gg
S/Yakutsk;RU;62;129.67
S/Yangon;MM;16.78;96.17;28
S/Yekaterinburg;RU;56.85;60.6;8v
S/Yerevan;AM;40.18;44.5;b1
T/Azores;PT;37.73;-25.67;y3
T/Bermuda;BM;32.28;-64.77;ze
T/Canary;ES;28.1;-15.4;lj
T/Cape_Verde;CV;14.92;-23.52;s3
T/Faroe;FO;62.02;-6.77;yo
T/Madeira;PT;32.63;-16.9;t5
T/Reykjavik;IS;64.15;-21.85;sq
T/South_Georgia;GS;-54.27;-36.53;zm
T/St_Helena;SH;-15.92;-5.7;zh
T/Stanley;FK;-51.7;-57.85;z6
U/Adelaide;AU;-34.92;138.58;91
U/Brisbane;AU;-27.47;153.03;3t
U/Broken_Hill;AU;-31.95;141.45
U/Darwin;AU;-12.47;130.83;s0
U/Eucla;AU;-31.72;128.87
U/Hobart;AU;-42.88;147.32;pl
U/Lindeman;AU;-20.27;149
U/Lord_Howe;AU;-31.55;159.08
U/Melbourne;AU;-37.82;144.97;1p
U/Perth;AU;-31.95;115.85;4p
U/Sydney;AU;-33.87;151.22;1n
E/Amsterdam;NL;52.37;4.9;ef
E/Andorra;AD;42.5;1.52;y1
E/Astrakhan;RU;46.35;48.05
E/Athens;GR;37.97;23.72;fb
E/Belgrade;RS;44.83;20.5;a1
E/Berlin;DE;52.5;13.37;2z
E/Bratislava;SK;48.15;17.12;ki
E/Brussels;BE;50.83;4.33;bx
E/Bucharest;RO;44.43;26.1;6c
E/Budapest;HU;47.5;19.08;73
E/Busingen;DE;47.7;8.68
E/Chisinau;MD;47;28.83;fx
E/Copenhagen;DK;55.67;12.58;az
E/Dublin;IE;53.33;-6.25;bw
E/Gibraltar;GI;36.13;-5.35;xf
E/Guernsey;GG;49.45;-2.54;yi
E/Helsinki;FI;60.17;24.97;fe
E/Isle_of_Man;IM;54.15;-4.47;xj
E/Istanbul;TR;41.02;28.97;7
E/Jersey;JE;49.18;-2.11;xb
E/Kaliningrad;RU;54.72;20.5
E/Kirov;RU;58.6;49.65
E/Kyiv;UA;50.43;30.52;3k
E/Lisbon;PT;38.72;-9.13;ie
E/Ljubljana;SI;46.05;14.52;pa
E/London;GB;51.51;-0.13;x
E/Luxembourg;LU;49.6;6.15;uj
E/Madrid;ES;40.4;-3.68;37
E/Malta;MT;35.9;14.52;xv
E/Mariehamn;AX;60.1;19.95;ys
E/Minsk;BY;53.9;27.57;72
E/Monaco;MC;43.7;7.38;wy
E/Moscow;RU;55.76;37.62;k
E/Oslo;NO;59.92;10.75;bc
E/Paris;FR;48.87;2.33;5e
E/Podgorica;ME;42.43;19.27;pv
E/Prague;CZ;50.08;14.43;at
E/Riga;LV;56.95;24.1;ee
E/Rome;IT;41.9;12.48;4v
E/Samara;RU;53.2;50.15;av
E/San_Marino;SM;43.92;12.47;z3
E/Sarajevo;BA;43.87;18.42;eu
E/Saratov;RU;51.57;46.03
E/Simferopol;UA;44.95;34.1
E/Skopje;MK;41.98;21.43;jd
E/Sofia;BG;42.68;23.32;b0
E/Stockholm;SE;59.33;18.05;8p
E/Tallinn;EE;59.42;24.75;la
E/Tirane;AL;41.33;19.83;kr
E/Ulyanovsk;RU;54.33;48.4
E/Vaduz;LI;47.15;9.52;z2
E/Vatican;VA;41.9;12.45;zg
E/Vienna;AT;48.22;16.33;7d
E/Vilnius;LT;54.68;25.32;hv
E/Volgograd;RU;48.73;44.42
E/Warsaw;PL;52.25;21;79
E/Zagreb;HR;45.8;15.97;fc
E/Zurich;CH;47.38;8.53;ku
I/Antananarivo;MG;-18.92;47.52;9l
I/Chagos;IO;-7.33;72.42
I/Christmas;CX;-10.42;105.72;za
I/Cocos;CC;-12.17;96.92;zj
I/Comoro;KM;-11.68;43.27;un
I/Kerguelen;TF;-49.35;70.22;zl
I/Mahe;SC;-4.67;55.47;xs
I/Maldives;MV;4.17;73.5;t8
I/Mauritius;MU;-20.17;57.5;rf
I/Mayotte;YT;-12.78;45.23;vi
I/Reunion;RE;-20.87;55.47;rg
P/Apia;WS;-13.83;-171.73;wg
P/Auckland;NZ;-36.87;174.77;8d
P/Bougainville;PG;-6.22;155.57
P/Chatham;NZ;-43.95;-176.55
P/Chuuk;FM;7.42;151.78
P/Easter;CL;-27.15;-109.43
P/Efate;VU;-17.67;168.42;ws
P/Fakaofo;TK;-9.37;-171.23
P/Fiji;FJ;-18.13;178.42;uh
P/Funafuti;TV;-8.52;179.22;yy
P/Galapagos;EC;-0.9;-89.6
P/Gambier;PF;-23.13;-134.95
P/Guadalcanal;SB;-9.53;160.2
P/Guam;GU;13.47;144.75;zd
P/Honolulu;US;21.31;-157.86;mk
P/Kanton;KI;-2.78;-171.72
P/Kiritimati;KI;1.87;-157.33
P/Kosrae;FM;5.32;162.98
P/Kwajalein;MH;9.08;167.33
P/Majuro;MH;7.15;171.2;xp
P/Marquesas;PF;-9;-139.5
P/Midway;UM;28.22;-177.37
P/Nauru;NR;-0.52;166.92;zc
P/Niue;NU;-19.02;-169.92;zi
P/Norfolk;NF;-29.05;167.97;zf
P/Noumea;NC;-22.27;166.45;to
P/Pago_Pago;AS;-14.27;-170.7;yq
P/Palau;PW;7.33;134.48;zo
P/Pitcairn;PN;-25.07;-130.08;zk
P/Pohnpei;FM;6.97;158.22;yw
P/Port_Moresby;PG;-9.5;147.17;p1
P/Rarotonga;CK;-21.23;-159.77;yn
P/Saipan;MP;15.2;145.75;w2
P/Tahiti;PF;-17.53;-149.57;xh
P/Tarawa;KI;1.42;173;wh
P/Tongatapu;TO;-21.13;-175.2;xw
P/Wake;UM;19.28;166.62
P/Wallis;WF;-13.3;-176.17;zb`,
  links: 'A/Asmera>4 A/Timbuktu>5 M/Buenos_Aires>1l M/Catamarca>1m M/Coral_Harbour>1z M/Cordoba>1n M/Godthab>4f M/Indianapolis>39 M/Jujuy>1o M/Louisville>3l M/Mendoza>1q M/Montreal>5a M/Virgin>54 S/Ashkhabad>5y S/Calcutta>6u S/Chongqing>7j S/Chungking>7j S/Dacca>6b S/Harbin>7j S/Istanbul>95 S/Kashgar>7u S/Katmandu>6s S/Macao>6z S/Rangoon>7z S/Saigon>6i S/Tel_Aviv>6o S/Thimbu>7q S/Ujung_Pandang>71 S/Ulan_Bator>7t T/Faeroe>86 T/Jan_Mayen>5r U/ACT>8m U/Canberra>8m U/LHI>8j U/NSW>8m U/North>8f U/Queensland>8d U/South>8c U/Tasmania>8h U/Victoria>8k U/West>8l E/Belfast>9c E/Kiev>99 E/Nicosia>74 E/Tiraspol>8y E/Uzhgorod>99 E/Zaporozhye>99 P/Enderbury>az P/Johnston>ay P/Ponape>bd P/Samoa>ba P/Truk>ao P/Yap>ao',
  countries: `AD;EUR;ca;CF;;112;;m;y1;vw:#10069f 8,#fedf00 9,#d50032 8|dot:15,10,2.6,#b07c2a
AE;AED;ar-AE,fa,en;G;;999;;d;6p;h:#00732f,#fff,#000|band:#ff0000 25
AF;AFN;fa-AF,ps,uz-AF;CF;;;45;m;2a;v:#000,#d32011,#007a36
AG;XCD;en-AG;AB;L;;;p;vu;bg:#ce1126|poly:#000,0 0 30 0 15 20|poly:#0072c6,6.5 8 23.5 8 15 20|poly:#fff,10.3 13 19.7 13 15 20|dot:15,6,2.4,#fcd116
AI;XCD;en-AI;AB;L;;;p;z7;bg:#012169|ukc|dot:22,10,3,#fff
AL;ALL;sq,el;CF;;112;;o;kr;bg:#e41e20|dot:15,10,4.5,#000
AM;AMD;hy;CF;;112;;m;b1;h:#d90012,#0033a0,#f2a800
AO;AOA;pt-AO;CF;;;;p;3u;h:#cc092f,#000|dot:15,10,3,#ffcb00
AQ;;;;;;;n
AR;ARS;es-AR,en,it;CI;;911;;t;3n;h:#74acdf,#fff,#74acdf|dot:15,10,1.9,#f6b40e
AS;USD;en-AS,sm,to;ABFI;;;;p;yq
AT;EUR;de-AT,hr,hu;CF;;112;;m;7d;h:#c8102e,#fff,#c8102e
AU;AUD;en-AU;I;L;000;;c;ly;bg:#012169|ukc|star:7.5,15,2.3,#fff|star:22.5,4.3,1,#fff|star:19.6,9.4,1,#fff|star:25.6,8.4,1,#fff|star:22.5,16.4,1.1,#fff
AW;AWG;nl-AW,pap,es;ABF;;;;p;x7;bg:#418fde|rect:0,13,30,1,#fbe122|rect:0,15,30,1,#fbe122|star:5,5,2.4,#ef3340
AX;EUR;sv-AX;CF;;112;;n;ys;nordic:#0064ad,#ffd300,#da0e15
AZ;AZN;az,ru,hy;CF;;112;;c;4t;h:#00b5e2,#ef3340,#509e2f|cres:14,10,2.8,#fff,#ef3340|star:17.2,10,1.1,#fff
BA;BAM;hr,sr;CF;;112;;o;eu;bg:#002395|poly:#fecb00,8.5 0 21.5 0 21.5 20
BB;BBD;en-BB;AB;L;211;;p;th;v:#00267f,#ffc726,#00267f|dot:15,10,2,#000
BD;BDT;bn-BD,en;CDGK;L;999;56;o;l;bg:#006a4e|dot:13.5,10,6,#f42a41
BE;EUR;nl,fr,de;CE;;112;;l;bx;v:#000,#fdda24,#ef3340
BF;XOF;fr-BF,mos;CE;;;;d;4l;h:#ef2b2d,#009e49|star:15,10,2.6,#fcd116
BG;EUR;bg,tr-BG,rom;CF;;112;;o;b0;h:#fff,#00966e,#d62612
BH;BHD;ar-BH,en,fa;G;;999;56;d;rs;bg:#ce1126|poly:#fff,0 0 7.5 0 10.5 2 7.5 4 10.5 6 7.5 8 10.5 10 7.5 12 10.5 14 7.5 16 10.5 18 7.5 20 0 20
BI;BIF;fr-BI,rn;CE;;;;m;v4;bg:#ce1126|poly:#1eb53a,0 0 15 10 0 20|poly:#1eb53a,30 0 15 10 30 20|sal:#fff,2.4|dot:15,10,4.6,#fff|dot:15,10,1.3,#ce1126
BJ;XOF;fr-BJ;CE;;;;p;pf;h:#fcd116,#e8112d|band:#008751 40
BL;EUR;fr;CE;;112;;p;z0
BM;BMD;en-BM,pt;AB;L;;;p;ze;bg:#c8102e|ukc|dot:22,10,3,#fff
BN;BND;ms-BN,en-BN;G;L;;50;p;v5;bg:#f7e017|poly:#fff,0 4 30 13 30 16 0 7|poly:#000,0 7 30 16 30 19 0 10|dot:15,11,3,#cf1126
BO;BOB;es-BO,qu,ay;AC;;110;;m;q1;h:#d52b1e,#f9e300,#007934
BQ;USD;nl,pap,en;AC;;;;p;yt
BR;BRL;pt-BR,es,en;CN;;190/192;;p;56;bg:#009c3b|loz:#ffdf00|dot:15,10,3.6,#002776
BS;BSD;en-BS;AB;L;911;;p;q0;h:#00abc9,#fae042,#00abc9|tri:#000,11
BT;BTN;dz;CDFGM;L;;;m;tg;poly:#ffcc33,0 0 30 0 0 20|poly:#ff6600,30 0 30 20 0 20|dot:15,10,3,#fff
BV;NOK;;;;;;n
BW;BWP;en-BW,tn-BW;DGM;L;;;d;pq;hw:#6da9d2 9,#fff 1,#000 4,#fff 1,#6da9d2 9
BY;BYN;be,ru;CF;;112;;o;72;hw:#c8313e 2,#4aa657 1|band:#fff 8|rect:1,0,2.6,20,#c8313e
BZ;BZD;en-BZ,es;ABG;;;;p;ym;hw:#ce1126 1,#003f87 8,#ce1126 1|dot:15,10,5,#fff
CA;CAD;en-CA,fr-CA,iu;AB;;911;;t;bz;ca
CC;AUD;ms-CC,en;I;L;;;p;zj
CD;CDF;fr-CD,ln,ktu;CDE;;;;p;6;bg:#007fff|diag:#f7d618,6|diag:#ce1021,3.6|star:5,5,3,#f7d618
CF;XAF;fr-CF,sg,ln;CE;;;;p;dq;h:#003082,#fff,#289728,#ffce00|rect:13,0,4,20,#d21034|star:4.5,2.5,1.6,#ffce00
CG;XAF;fr-CG,kg,ln-CG;CE;;;;p;5t;poly:#009543,0 0 20 0 0 20|poly:#dc241f,30 0 30 20 10 20|poly:#fbde4a,20 0 30 0 10 20 0 20
CH;CHF;de,fr,it;CJ;;112;;m;sk;swiss:#da291c,#fff
CI;XOF;fr-CI;CE;;;;p;p7;v:#f77f00,#fff,#009e60
CK;NZD;en-CK,mi;I;L;;;p;yn;bg:#012169|ukc|ring:22.5,10,4,#fff,1
CL;CLP;es-CL;CL;;133/131;;m;1w;h:#fff,#d52b1e|rect:0,0,10,10,#0039a6|star:5,5,2.6,#fff
CM;XAF;en-CM,fr-CM;CE;;;;p;9w;v:#007a5e,#ce1126,#fcd116|star:15,10,2.6,#fcd116
CN;CNY;zh;ACI;;110/120;;t;3;cn
CO;COP;es-CO;AB;;123;;m;15;hw:#fcd116 2,#003893 1,#ce1126 1
CR;CRC;es-CR,en;AB;;911;;p;n7;hw:#002b7f 1,#fff 1,#ce1126 2,#fff 1,#002b7f 1
CU;CUP;es-CU,pap;ABCL;;106;;o;5b;alt:5,#002a8f,#fff|tri:#cf142b,13|star:4.5,10,2.6,#fff
CV;CVE;pt-CV;CF;;;;p;s3;hw:#003893 6,#fff 1,#cf2027 1,#fff 1,#003893 3|ring:11,12.5,4,#f7d116,.8
CW;XCG;nl,pap;AB;;;;p;sg;hw:#002b7f 5,#f9e814 1,#002b7f 2|star:4,4,1.6,#fff|star:7,7,1.1,#fff
CX;AUD;en,zh,ms-CX;I;L;;;p;za
CY;EUR;el;G;L;112;;c;qm;bg:#fff|poly:#d57800,7 10 12 7.5 18 6.5 23 7 20 9.5 14 11 9 12|oval:15,14.5,5,1,#4e5b31
CZ;CZK;cs,sk;CE;;112;;o;at;h:#fff,#d7141a|tri:#11457e,15
DE;EUR;de;CF;;112;;o;2z;h:#000,#dd0000,#ffce00
DJ;DJF;fr-DJ,ar,so-DJ;CE;;;;d;g4;h:#6ab2e7,#12ad2b|tri:#fff,15|star:5,10,2,#d7141a
DK;DKK;da-DK,en,fo;CEFK;;112;;o;az;nordic:#c8102e,#fff
DM;XCD;en-DM;DG;L;;;p;yh;bg:#006b3f|rect:12.5,0,1.5,20,#fcd116|rect:14,0,1.5,20,#000|rect:15.5,0,1.5,20,#fff|rect:0,7.5,30,1.5,#fcd116|rect:0,9,30,1.5,#000|rect:0,10.5,30,1.5,#fff|dot:15,10,3.8,#d41c30
DO;DOP;es-DO;ABC;;911;;p;58;bg:#fff|rect:0,0,13,8,#002d62|rect:17,0,13,8,#ce1126|rect:0,12,13,8,#ce1126|rect:17,12,13,8,#002d62|dot:15,10,1.4,#4f7d2c
DZ;DZD;ar-DZ;CF;;;56;d;4r;v:#006233,#fff|cres:15,10,4.6,#d21034,#fff|star:17.6,10,1.8,#d21034
EC;USD;es-EC;AB;;911;;m;3s;hw:#ffd100 2,#0072ce 1,#ef3340 1|dot:15,10,2.4,#7a5d2c
EE;EUR;et,ru;CF;;112;;o;la;h:#0072ce,#000,#fff
EG;EGP;ar-EG,en,fr;CF;;122/123;56;d;q;h:#ce1126,#fff,#000|dot:15,10,2,#c09300
EH;MAD;ar,mey;CE;;;;d
ER;ERN;aa-ER,ar,tig;CL;;;;d;hh;h:#12ad2b,#4189dd|poly:#ea0437,0 0 30 10 0 20|ring:7,10,3.4,#ffc726,.8
ES;EUR;es-ES,ca,gl;CF;;112;;o;37;hw:#aa151b 1,#f1bf00 2,#aa151b 1
ET;ETB;am,en-ET,om-ET;CEFL;;;;m;2k;h:#078930,#fcdd09,#da121a|dot:15,10,4,#0f47af|star:15,10,2.6,#fcdd09
FI;EUR;fi-FI,sv-FI,smn;CF;;112;;o;fe;nordic:#fff,#002f6c
FJ;FJD;en-FJ,fj;I;L;;;p;uh;bg:#68bfe5|ukc|oval:22.5,10.5,2.8,3.4,#fff
FK;FKP;en-FK;G;L;;;c;z6;bg:#012169|ukc|dot:22,10,3,#fff
FM;USD;en-FM,chk,pon;AB;;;;p;yw;bg:#75b2dd|star:15,4.5,1.6,#fff|star:15,15.5,1.6,#fff|star:9.5,10,1.6,#fff|star:20.5,10,1.6,#fff
FO;DKK;fo,da-FO;CEFK;;112;;n;yo;nordic:#fff,#0065bd,#ef303e
FR;EUR;fr-FR,frp,br;CE;;112;;o;5e;v:#0055a4,#fff,#ef4135
GA;XAF;fr-GA;C;;;;p;dc;h:#009e60,#fcd116,#3a75c4
GB;GBP;en-GB,cy-GB,gd;G;L;999;;o;x;uk
GD;XCD;en-GD;G;L;;;p;yv;bg:#ce1126|rect:2.5,2.5,25,15,#fcd116|poly:#007a5e,2.5 2.5 15 10 2.5 17.5|poly:#007a5e,27.5 2.5 15 10 27.5 17.5|dot:15,10,2.4,#ce1126
GE;GEL;ka,ru,hy;CF;;112;;m;bk;bg:#fff|cross:#f00,4|plus:6.8,4.5,3,#f00|plus:23.2,4.5,3,#f00|plus:6.8,15.5,3,#f00|plus:23.2,15.5,3,#f00
GF;EUR;fr-GF;CDE;;112;;p;v8;v:#0055a4,#fff,#ef4135
GG;GBP;en,nrf;G;L;999;;c;yi;bg:#fff|cross:#e8112d,5|cross:#f9dd16,1.6
GH;GHS;en-GH,ak,ee;DG;;112;;p;61;h:#ce1126,#fcd116,#006b3f|star:15,10,2.8,#000
GI;GIP;en-GI,es,it;G;;112;;c;xf;hw:#fff 2,#da000c 1|rect:12,4,6,6,#da000c
GL;DKK;kl,da-GL,en;CEFK;;112;;n;yl;h:#fff,#d00c33|half:11,10,5.5,#d00c33,#fff
GM;GMD;en-GM,mnk,wof;G;;;;p;wp;hw:#ce1126 6,#fff 1,#0c1c8c 4,#fff 1,#3a7728 6
GN;GNF;fr-GN;CFK;;;;p;64;v:#ce1126,#fcd116,#009460
GP;EUR;fr-GP;CDE;;112;;p;yr;v:#0055a4,#fff,#ef4135
GQ;XAF;es-GQ,fr,pt;CE;;;;p;z8;h:#3e9a00,#fff,#e32118|tri:#0073ce,7
GR;EUR;el-GR,en,fr;CF;;112;;c;fb;gr
GS;GBP;en;;;;;n;zm
GT;GTQ;es-GT;AB;;;;p;c4;v:#4997d0,#fff,#4997d0|dot:15,10,2.4,#6c9a3b
GU;USD;en-GU,ch-GU;AB;;911;;p;zd;bg:#c62139|rect:1,1,28,18,#00297b|oval:15,10,3,4,#6fb8e8
GW;XOF;pt-GW,pov;C;;;;p;k7;h:#fcd116,#009e49|band:#ce1126 33|star:5,10,2.4,#000
GY;GYD;en-GY;ABDG;L;;;p;py;bg:#009e49|poly:#fff,0 0 30 10 0 20|poly:#fcd116,0 1.2 28 10 0 18.8|poly:#000,0 0 15 10 0 20|poly:#ce1126,0 1.6 12.6 10 0 18.4
HK;HKD;zh-Hant,en;G;L;999;;t;17;bg:#de2910|dot:15,10,4.6,#fff|dot:15,10,1.2,#de2910
HM;AUD;;;;;;n
HN;HNL;es-HN,cab,miq;AB;;;;p;d8;h:#0073cf,#fff,#0073cf|star:15,10,1,#0073cf|star:11,8.5,1,#0073cf|star:19,8.5,1,#0073cf|star:11,11.5,1,#0073cf|star:19,11.5,1,#0073cf
HR;EUR;hr-HR,sr;CF;;112;;c;fc;h:#ff0000,#fff,#171796|chk:12.5,4.5,4,5,1.25,#ff0000,#fff
HT;HTG;ht,fr-HT;AB;;;;p;ac;h:#00209f,#d21034|rect:11,7,8,6,#fff
HU;HUF;hu-HU;CF;;112;;o;73;h:#ce2939,#fff,#477050
ID;IDR;id,en,nl;CF;L;112;;p;z;h:#ff0000,#fff
IE;EUR;en;G;L;112;;o;bw;v:#169b62,#fff,#ff883e
IL;ILS;he,ar-IL,en-IL;CH;;100/101;56;o;;il
IM;GBP;en,gv;G;L;999;;c;xj;bg:#cf142b|ring:15,10,2.6,#fff,1.4
IN;INR;hi,en;CDM;L;112;;o;o5;h:#ff9933,#fff,#138808|ring:15,10,2.5,#000080,.6|dot:15,10,.6,#000080
IO;USD;en-IO;G;;;;p
IQ;IQD;ar-IQ,ku,hy;CDG;;;56;d;18;h:#ce1126,#fff,#000|rect:10,9,10,2,#007a3d
IR;IRR;fa-IR,ku;CF;;;5;d;1b;h:#239f40,#fff,#da0000|dot:15,10,2.2,#da0000
IS;ISK;is,en,de;CF;;112;;n;sq;nordic:#02529c,#fff,#dc1e35
IT;EUR;it-IT,de-IT,fr-IT;CFL;;112;;o;4v;v:#009246,#fff,#ce2b37
JE;GBP;en,fr,nrf;G;L;999;;c;xb;bg:#fff|sal:#df112d,3|dot:15,4.5,2,#df112d
JM;JMD;en-JM;AB;L;119;;p;cf;poly:#009b3a,0 0 30 0 15 10|poly:#009b3a,0 20 30 20 15 10|poly:#000,0 0 15 10 0 20|poly:#000,30 0 15 10 30 20|sal:#fed100,3
JO;JOD;ar-JO,en;BCDFGJ;;911;56;d;9z;h:#000,#fff,#007a3d|tri:#ce1126,15|star:5.5,10,1.5,#fff
JP;JPY;ja;AB;L;110/119;;t;o;disc:#fff,#bc002d
KE;KES;sw,en;G;L;999;;t;2b;hw:#000 6,#fff 1,#bb0000 6,#fff 1,#006600 6|oval:15,10,3,7,#bb0000|oval:15,10,1.2,5.5,#000
KG;KGS;ky,uz,ru;CF;;112;;m;cu;bg:#e8112d|dot:15,10,4.6,#ffef00|dot:15,10,2.8,#e8112d
KH;KHR;km,fr,en;ACG;;;;p;86;hw:#032ea1 1,#e00025 2,#032ea1 1|rect:11,7,8,6,#fff
KI;AUD;en-KI,gil;I;L;;;p;wh;hw:#ce1126 1,#003f87 1|rect:0,13,30,1.5,#fff|rect:0,16.5,30,1.5,#fff|dot:15,10,3.6,#fcd116
KM;KMF;ar,fr-KM;CE;;;;p;un;h:#ffc61e,#fff,#ce1126,#3a75c4|tri:#3d8e33,13|cres:5,10,3.4,#fff,#3d8e33
KN;XCD;en-KN;DG;L;;;p;yp;poly:#009e49,0 0 30 0 0 20|poly:#ce1126,30 0 30 20 0 20|diag:#fcd116,7|diag:#000,5|star:10,13.5,1.5,#fff|star:20,6.5,1.5,#fff
KP;KPW;ko-KP;AC;;;;t;38;hw:#024fa2 3,#fff 1,#ed1c27 12,#fff 1,#024fa2 3|dot:10,10,3.5,#fff|star:10,10,3.3,#ed1c27
KR;KRW;ko-KR,en;CF;;112/119;;t;m;kr
XK;EUR;sq,sr;CF;;112;;o;hp;bg:#244aa5|poly:#d0a650,10 10 13 7 18 7.5 20 11 17 14 12 13|star:10,4.5,.8,#fff|star:13,3.7,.8,#fff|star:16,3.5,.8,#fff|star:19,3.7,.8,#fff|star:21.5,4.5,.8,#fff
KW;KWD;ar-KW,en;CG;;112;56;d;vc;h:#007a3d,#fff,#ce1126|poly:#000,0 0 7.5 6.67 7.5 13.33 0 20
KY;KYD;en-KY;AB;L;;;p;x8;bg:#012169|ukc|dot:22,10,3,#fff
KZ;KZT;kk,ru;CF;;112;;t;8g;bg:#00afca|dot:15,9,3.6,#fec50c|rect:1.5,0,1.4,20,#fec50c
LA;LAK;lo,fr,en;ABCEF;;;;p;dh;hw:#ce1126 1,#002868 2,#ce1126 1|dot:15,10,4,#fff
LB;LBP;ar-LB,fr-LB,en;ABCDG;;112;;o;68;hw:#ed1c24 1,#fff 2,#ed1c24 1|poly:#00a651,15 5.5 19.5 14 10.5 14
LC;XCD;en-LC;G;L;;;p;y5;bg:#66ccff|poly:#fff,15 3 21 17 9 17|poly:#000,15 5 20 17 10 17|poly:#fcd116,15 10 21 17 9 17
LI;CHF;de-LI;CJ;;112;;m;z2;h:#002b7f,#ce1126|dot:7,5,2,#ffd83d
LK;LKR;si,ta,en;DG;L;119;;p;fo;bg:#ffb700|rect:1,1,4,18,#00534e|rect:5,1,4,18,#eb7400|rect:10,1,19,18,#8d153a|dot:19.5,10,3.6,#ffb700
LR;LRD;en-LR;AB;;;;p;8i;alt:11,#bf0a30,#fff|rect:0,0,10,9.1,#002868|star:5,4.5,2.6,#fff
LS;LSL;en-LS,st,zu;M;L;;;m;mb;hw:#00209f 3,#fff 4,#009543 3|dot:15,10,1.8,#000
LT;EUR;lt,ru,pl;CF;;112;;o;hv;h:#fdb913,#006a44,#c1272d
LU;EUR;fr,de;CF;;112;;o;uj;h:#ed2939,#fff,#00a1de
LV;EUR;lv,ru,lt;CF;;112;;o;ee;hw:#9e3039 2,#fff 1,#9e3039 2
LY;LYD;ar-LY,it,en;CL;;;56;d;9u;hw:#e70013 1,#000 2,#239e46 1|cres:14,10,2.8,#fff,#000|star:17.2,10,1.2,#fff
MA;MAD;ar-MA,ber,fr;CE;;19/15;;d;7k;bg:#c1272d|pent:15,10,4,#006233,.9
MC;EUR;fr-MC,en,it;CDEF;;112;;c;wy;h:#ce1126,#fff
MD;MDL;ro,ru,gag;CF;;112;;o;fx;v:#0046ae,#ffd200,#cc092f|dot:15,10,2.4,#b07e2b
ME;EUR;sr;CF;;112;;c;pv;bg:#d4af3a|rect:1,1,28,18,#c40308|dot:15,10,3,#d4af3a
MF;EUR;fr;CE;;112;;p;z1;v:#0055a4,#fff,#ef4135
MG;MGA;fr-MG,mg;CDEJK;;;;p;9l;h:#fc3d32,#007e3a|band:#fff 33
MH;USD;mh,en-MH;AB;;;;p;xp;bg:#003893|poly:#dd7500,0 20 30 2 30 5|poly:#fff,0 20 30 5 30 8|star:7,6,3,#fff
MK;MKD;mk,sq,tr;CF;;112;;o;jd;bg:#d20000|poly:#ffe600,0 0 4.5 0 15 10 0 3|poly:#ffe600,30 0 25.5 0 15 10 30 3|poly:#ffe600,0 20 4.5 20 15 10 0 17|poly:#ffe600,30 20 25.5 20 15 10 30 17|poly:#ffe600,13 0 17 0 15 10|poly:#ffe600,13 20 17 20 15 10|poly:#ffe600,0 8.5 0 11.5 15 10|poly:#ffe600,30 8.5 30 11.5 15 10|dot:15,10,3.2,#d20000|dot:15,10,2.6,#ffe600
ML;XOF;fr-ML,bm;CE;;;;d;2f;v:#14b53a,#fcd116,#ce1126
MM;MMK;my;CDFG;;;;p;ch;h:#fecb00,#34b233,#ea2839|star:15,10.6,6,#fff
MN;MNT;mn,ru;CE;;;;m;dd;v:#c4272f,#015197,#c4272f|dot:5,5.5,1.4,#f9cf02|rect:3.5,8,3,7.5,#f9cf02
MO;MOP;zh-Hant,pt;G;L;999;;t;fm;bg:#00785e|dot:15,11.5,4,#fff|star:15,5,1.6,#fbd116
MP;USD;fil,tl,zh;AB;;;;p;w2
MQ;EUR;fr-MQ;CDE;;112;;p;tu;v:#0055a4,#fff,#ef4135
MR;MRU;ar-MR,fuc,snk;C;;;;d;ar;hw:#d01c1f 1,#00a95c 4,#d01c1f 1|cres:15,9.5,4.4,#ffd700,#00a95c,u|star:15,7,1.6,#ffd700
MS;XCD;en-MS;AB;L;;;p;zn;bg:#012169|ukc|dot:22,10,3,#fff
MT;EUR;en;G;L;112;;c;yx;v:#fff,#cf142b|rect:2,2,3,3,#9a9a9a
MU;MUR;en-MU,bho,fr;CG;L;;;p;rf;h:#ea2839,#1a206d,#ffd500,#00a551
MV;MVR;dv,en;CDGJKL;L;119;56;p;t8;bg:#d21034|rect:5,5,20,10,#007e3a|cres:16,10,3.2,#fff,#007e3a
MW;MWK;ny,yao,tum;G;L;;;p;b6;h:#000,#ce1126,#339e35|dot:15,6.6,2.4,#ce1126
MX;MXN;es-MX;AB;;911;;o;g;v:#006847,#fff,#ce1126|dot:15,10,2.3,#8c6b2b
MY;MYR;ms,en;G;L;999;;t;93;alt:14,#cc0001,#fff|rect:0,0,15,11.43,#010066|cres:6,5.7,4,#fc0,#010066|star:11,5.7,2.6,#fc0
MZ;MZN;pt-MZ,vmw;CFM;L;;;p;a6;hw:#009739 6,#fff 1,#000 6,#fff 1,#fce100 6|tri:#d21034,13|star:5,10,2.8,#fce100
NA;NAD;en-NA,af,de;DM;L;;;d;li;poly:#003580,0 0 24 0 0 16|poly:#009543,30 4 30 20 6 20|diag:#fff,7|diag:#d21034,5|dot:6,5,2.4,#ffce00
NC;XPF;fr-NC;CF;;112;;p;to;v:#0055a4,#fff,#ef4135
NE;XOF;fr-NE,ha,kr;ABCDEF;;;;d;9r;h:#e05206,#fff,#0db02b|dot:15,10,2.2,#e05206
NF;AUD;en-NF;I;L;;;c;zf
NG;NGN;en-NG,ha,yo;DG;;112;;t;46;v:#008751,#fff,#008751
NI;NIO;es-NI,en;AB;;;;p;c8;h:#0067c6,#fff,#0067c6|ring:15,10,1.8,#c8a800,.5
NL;EUR;nl-NL,fy-NL;CF;;112;;l;ef;h:#ae1c28,#fff,#21468b
NO;NOK;nb;CF;;112;;m;bc;nordic:#ba0c2f,#fff,#00205b
NP;NPR;ne,en;CDM;L;100;6;m;96;poly:#003893,0 0 22.6 10.2 7.2 10.2 22.6 20 0 20|poly:#dc143c,1.4 2.6 18.8 9.2 4.4 9.2 18.8 18.8 1.4 18.8|dot:6.8,7.4,1.6,#fff|dot:6.8,14.6,2,#fff
NR;AUD;na,en-NR;I;L;;;p;zc;hw:#002b7f 9,#ffc61e 1,#002b7f 9|star:7,14.5,2.4,#fff
NU;NZD;niu,en-NU;I;L;;;p;zi;bg:#fed000|ukc
NZ;NZD;en;I;L;111;;m;lk;bg:#012169|ukc|star:22.5,4.4,1.3,#cc142b|star:19.8,9.4,1.3,#cc142b|star:25.4,8.5,1.1,#cc142b|star:22.5,16,1.4,#cc142b
OM;OMR;ar-OM,en,bal;CG;;9999;56;d;dw;h:#fff,#db161b,#008000|band:#db161b 25|dot:3.6,3.6,1.8,#fff
PA;PAB;es-PA,en;AB;;911;;p;kx;rect:0,0,15,10,#fff|rect:15,0,15,10,#d21034|rect:0,10,15,10,#005293|rect:15,10,15,10,#fff|star:7.5,5,2.4,#005293|star:22.5,15,2.4,#d21034
PE;PEN;es-PE,qu,ay;ABC;;105;;c;14;v:#d91023,#fff,#d91023
PF;XPF;fr-PF,ty;ABE;;112;;p;xh;hw:#ce1126 1,#fff 2,#ce1126 1|dot:15,10,3,#f4a10a
PG;PGK;en-PG,ho,meu;I;L;;;p;p1;poly:#000,0 0 0 20 30 20|poly:#ce1126,0 0 30 0 30 20|dot:21,6,2.6,#fcd116|star:7,9,1,#fff|star:9.5,13,1,#fff|star:5,13.5,1,#fff|star:7,17,1,#fff
PH;PHP;tl,en;ABC;;911;;p;7z;h:#0038a8,#ce1126|tri:#fff,17.3|dot:6,10,2.2,#fcd116
PK;PKR;ur-PK,en-PK,pa;CD;L;15/1122;;o;gi;bg:#01411c|band:#fff 25|cres:19,10,5,#fff,#01411c|star:22.4,8.2,1.6,#fff
PL;PLN;pl;CE;;112;;o;79;h:#fff,#dc143c
PM;EUR;fr-PM;CE;;112;;c;yz;v:#0055a4,#fff,#ef4135
PN;NZD;en-PN;I;L;;;p;zk
PR;USD;en-PR,es-PR;AB;;911;;p;ks;alt:5,#ed0000,#fff|tri:#0050f0,13|star:4.5,10,2.4,#fff
PS;ILS;ar-PS;CH;;;56;o;;h:#000,#fff,#007a3d|tri:#ce1126,10
PT;EUR;pt-PT,mwl;CF;;112;;c;ie;vw:#046a38 2,#da291c 3|dot:12,10,4.2,#ffcc29
PW;USD;pau,sov,en-PW;AB;;;;p;zo;bg:#4aadd6|dot:13,10,6,#ffde00
PY;PYG;es-PY,gn;C;;911;;o;8y;h:#d52b1e,#fff,#0038a8|ring:15,10,1.8,#77a54b,.6
QA;QAR;ar-QA,es;DG;;999;56;d;n0;bg:#8a1538|poly:#fff,0 0 8 0 11 1.11 8 2.22 11 3.33 8 4.44 11 5.56 8 6.67 11 7.78 8 8.89 11 10 8 11.11 11 12.22 8 13.33 11 14.44 8 15.56 11 16.67 8 17.78 11 18.89 8 20 0 20
RE;EUR;fr-RE;CE;;112;;p;rg;v:#0055a4,#fff,#ef4135
RO;RON;ro,hu,rom;CF;;112;;o;6c;v:#002b7f,#fcd116,#ce1126
RS;RSD;sr,hu,bs;CF;;112;;o;a1;h:#c6363c,#0c4076,#fff|oval:10,9.5,2.6,3.4,#c6363c
RU;RUB;ru,tt,xal;CF;;112;;o;k;h:#fff,#0039a6,#d52b1e
RW;RWF;rw,en-RW,fr-RW;CJ;;;;m;b2;hw:#00a1de 2,#fad201 1,#20603d 1|dot:24.5,5,2.6,#e5be01
SA;SAR;ar-SA;G;;911;56;d;2g;bg:#006c35|rect:8,6.5,14,2.5,#fff|rect:8,12,13,1,#fff
SB;SBD;en-SB,tpi;GI;L;;;p;ve;poly:#0051ba,0 0 30 0 0 20|poly:#215b33,30 0 30 20 0 20|diag:#fcd116,1.6|star:3,3,1,#fff|star:8,3,1,#fff|star:5.5,5,1,#fff|star:3,7,1,#fff|star:8,7,1,#fff
SC;SCR;en-SC,fr-SC;G;L;;;p;xs;poly:#003f87,0 20 0 0 10 0|poly:#fcd856,0 20 10 0 20 0|poly:#d62828,0 20 20 0 30 0 30 6.67|poly:#fff,0 20 30 6.67 30 13.33|poly:#007a3d,0 20 30 13.33 30 20
SD;SDG;ar-SD,en,fia;CD;;;56;d;5x;h:#d21034,#fff,#000|tri:#007229,10
SS;SSP;en;CD;;;;p;k3;hw:#000 6,#fff 1,#da121a 6,#fff 1,#078930 6|tri:#0f47af,13|star:4.5,10,2.4,#fcdd09
SE;SEK;sv-SE,se,sma;CF;;112;;o;8p;nordic:#006aa7,#fecc00
SG;SGD;en;G;L;999/995;;t;1o;h:#ef3340,#fff|cres:6,5,3.2,#fff,#ef3340|star:10,3,.8,#fff|star:12,4.6,.8,#fff|star:11.2,7,.8,#fff|star:8.8,7,.8,#fff|star:8,4.6,.8,#fff
SH;SHP;en-SH;G;L;;;c;zh
SI;EUR;sl,sh;CF;;112;;o;pa;h:#fff,#005da4,#ed1c24|rect:6,3,5,6,#005da4
SJ;NOK;no,ru;CF;;112;;n;z5;nordic:#ba0c2f,#fff,#00205b
SK;EUR;sk,hu;CE;;112;;o;ki;h:#fff,#0b4ea2,#ee1c25|rect:6,4.5,7,8,#ee1c25|plus:9.5,8,3,#fff
SL;SLE;en-SL,men,tem;DG;;;;p;du;h:#1eb53a,#fff,#0072c6
SM;EUR;it-SM;CFL;;112;;o;z3;h:#fff,#5eb6e4|dot:15,10,2.4,#e9c46a
SN;XOF;fr-SN,wo,fuc;CDEK;;;;p;4b;v:#00853f,#fdef42,#e31b23|star:15,10,2.6,#00853f
SO;SOS;so-SO,ar-SO,it;C;;;;d;4e;bg:#4189dd|star:15,10,4,#fff
SR;SRD;nl-SR,en,srn;CF;L;;;p;q4;hw:#377e3f 2,#fff 1,#b40a2d 4,#fff 1,#377e3f 2|star:15,10,3,#ecc81d
ST;STN;pt-ST;CF;;;;p;vo;h:#12ad2b,#ffce00,#12ad2b|tri:#d21034,9|star:14,10,1.7,#000|star:20,10,1.7,#000
SV;USD;es-SV;AB;;;;p;i7;h:#0047ab,#fff,#0047ab|dot:15,10,1.9,#c8a800
SX;XCG;nl,en;AB;;;;p;z9;h:#dc171d,#012a87|tri:#fff,15|dot:5,10,2,#f9d90f
SY;SYP;ar-SY,ku,hy;CEL;;;56;o;88;h:#007a3d,#fff,#000|star:10,10,1.5,#ce1126|star:15,10,1.5,#ce1126|star:20,10,1.5,#ce1126
SZ;SZL;en-SZ,ss-SZ;M;L;;;m;uk;hw:#3e5eb9 3,#ffd900 1,#b10c0c 8,#ffd900 1,#3e5eb9 3|oval:15,10,6,2.6,#fff|oval:17,10,4,2.6,#000
TC;USD;en-TC;AB;L;;;p;z4;bg:#012169|ukc|dot:22,10,3,#fcd116
TD;XAF;fr-TD,ar-TD,sre;CDEF;;;;d;9j;v:#002664,#fecb00,#c60c30
TF;EUR;fr;;;;;n;zl
TG;XOF;fr-TG,ee,hna;C;;;;p;59;alt:5,#006a4e,#ffce00|rect:0,0,12,12,#d21034|star:6,6,3,#fff
TH;THB;th,en;ABCFO;L;191/1669;;p;1u;hw:#a51931 1,#f4f5f8 1,#2d2a4a 2,#f4f5f8 1,#a51931 1
TJ;TJS;tg,ru;CF;;;;m;f2;hw:#cc0000 2,#fff 3,#006600 2|dot:15,10,1.8,#f8c300
TK;NZD;tkl,en-TK;I;L;;;p
TL;USD;tet,pt-TL,id;CEFI;L;;;p;rl;bg:#dc241f|tri:#ffc726,15|tri:#000,10|star:3.5,10,2,#fff
TM;TMT;tk,ru,uz;BCF;;;;d;bt;bg:#00843d|rect:4,0,5,20,#d22630|cres:14,6,2.4,#fff,#00843d
TN;TND;ar-TN,fr;CE;;197/190;;d;ev;bg:#e70013|dot:15,10,5,#fff|cres:14.6,10,3.6,#e70013,#fff|star:16.4,10,1.6,#e70013
TO;TOP;to,en-TO;I;L;;;p;xw;bg:#c10000|rect:0,0,13,10,#fff|plus:6.5,5,6,#c10000
TR;TRY;tr-TR,ku,diq;CF;;112;;o;2w;bg:#e30a17|cres:11.5,10,5,#fff,#e30a17|star:17,10,2,#fff
TT;TTD;en-TT,hns,fr;AB;L;999;;p;w1;bg:#ce1126|diag2:#fff,8|diag2:#000,6
TV;AUD;tvl,en,sm;I;L;;;p;yy;bg:#5b97b1|ukc|star:22,4,1,#fcd116|star:26,8,1,#fcd116|star:19,12,1,#fcd116|star:24,15,1,#fcd116|star:20,17,1,#fcd116
TW;TWD;zh-Hant;AB;;110/119;;t;13;bg:#fe0000|rect:0,0,15,10,#000095|dot:7.5,5,2.6,#fff
TZ;TZS;sw-TZ,en,ar;DG;L;112;;p;e7;poly:#1eb53a,0 0 30 0 0 20|poly:#00a3dd,30 0 30 20 0 20|diag:#fcd116,7|diag:#000,5
UA;UAH;uk,ru-UA,rom;CF;;112;;o;3k;h:#0057b7,#ffd700
UG;UGX;en-UG,lg,sw;G;L;;;p;7i;h:#000,#fcdc04,#d90000,#000,#fcdc04,#d90000|dot:15,10,3.2,#fff
UM;USD;en-UM;AB;;911;;p;;us
US;USD;en-US,es-US,haw;AB;;911;;t;ew;us
UY;UYU;es-UY;CFIL;;911;;c;a4;alt:9,#fff,#0038a8|rect:0,0,11,11.1,#fff|dot:5.5,5.5,2.6,#fcd116
UZ;UZS;uz,ru,tg;CF;;;;o;5u;hw:#0099b5 10,#ce1126 .6,#fff 8,#ce1126 .6,#1eb53a 10|cres:4.5,3.5,2.2,#fff,#0099b5
VA;EUR;la,it,fr;CFL;;112;;o;zg;vw:#ffe000 1,#fff 1|dot:22.5,10,2.6,#b8a37a
VC;XCD;en-VC,fr;ACEGIK;L;;;p;xr;vw:#002674 1,#fcd116 2,#009e60 1|poly:#009e60,12.5 6 14.5 9 12.5 12 10.5 9|poly:#009e60,17.5 6 19.5 9 17.5 12 15.5 9|poly:#009e60,15 10 17 13 15 16 13 13
VE;VES;es-VE;AB;;911;;p;3j;h:#fcd116,#003893,#cf142b|star:11.6,10.8,0.6,#fff|star:12.2,9.7,0.6,#fff|star:13.2,8.9,0.6,#fff|star:14.4,8.5,0.6,#fff|star:15.6,8.5,0.6,#fff|star:16.8,8.9,0.6,#fff|star:17.8,9.7,0.6,#fff|star:18.4,10.8,0.6,#fff
VG;USD;en-VG;AB;L;;;p;yu;bg:#012169|ukc|dot:22,10,3,#009c41
VI;USD;en-VI;AB;L;911;;p;y6;bg:#fff|dot:15,10,3.6,#ffd100
VN;VND;vi,en,fr;ACG;;113/115;;p;12;bg:#da251d|star:15,10,5,#ff0
VU;VUV;bi,en-VU,fr-VU;I;;;;p;ws;h:#d21034,#009543|poly:#000,0 0 13 10 0 20|poly:#fdce12,0 1.5 1.5 0 15 10 1.5 20 0 18.5 12 10
WF;XPF;wls,fud,fr-WF;CE;;112;;p;zb;v:#0055a4,#fff,#ef4135
WS;WST;sm,en-WS;I;L;;;p;wg;bg:#ce1126|rect:0,0,15,10,#002b7f|star:7.5,2.6,1,#fff|star:5,5.4,1,#fff|star:10,5,1,#fff|star:7.5,8,1,#fff
YE;YER;ar-YE;ADG;;;56;d;63;h:#ce1126,#fff,#000
YT;EUR;fr-YT;CE;;112;;p;vi;v:#0055a4,#fff,#ef4135
ZA;ZAR;zu,af,en;CDMN;L;10111/112;;t;5i;za
ZM;ZMW;en-ZM,bem,loz;CDG;L;;;p;55;bg:#198a00|rect:21,8,3,12,#de2010|rect:24,8,3,12,#000|rect:27,8,3,12,#ef7d00|dot:25.5,4,2,#ef7d00
ZW;ZWG;en-ZW,sn,nr;DG;L;;;p;8h;h:#319208,#ffd200,#de2010,#000,#de2010,#ffd200,#319208|poly:#fff,0 0 11 10 0 20|star:4,10,2.4,#de2010`,
  cities: `Shanghai;;7j;31.22;121.46;j6z
Chongqing;;7j;29.56;106.56;gz4
Chengdu;;7j;30.67;104.07;g5m
Beijing;;7j;39.91;116.4;emp;;;Peking
Guangzhou;;7j;23.12;113.25;eet;;;Canton
Shenzhen;;7j;22.55;114.07;dhy
Kinshasa;;t;-4.33;15.31;ccg
Istanbul;;95;41.01;28.95;c46;t
Lagos;;u;6.45;3.39;bvg
Ho Chi Minh City;;6i;10.82;106.63;asz;t;;Saigon
Tianjin;;7j;39.14;117.18;ap6
Wuhan;;7j;30.58;114.27;aln
Lahore;;6r;31.56;74.35;a18
Xi’an;;7j;34.26;108.93;9zt;o
Mumbai;;6u;19.07;72.88;9sk;t;;Bombay
São Paulo;;4x;-23.55;-46.64;9kg;t
Mexico City;;42;19.43;-99.13;9hi;t;;Ciudad de México,CDMX
Hangzhou;;7j;30.29;120.16;97k
Karachi;;6r;24.86;67.01;8yw;d
Delhi;;6u;28.65;77.23;8ij
Moscow;;9j;55.75;37.62;80d;t;;Moskva
Dhaka;;6b;23.71;90.41;7zp;t;;Dacca
Seoul;;7i;37.57;126.98;7zh;;;Soul
Harbin;;7j;45.75;126.65;7q2
Tokyo;;7r;35.69;139.69;7id
Dongguan;;7j;23.02;113.75;7fx
Cairo;;c;30.06;31.25;7ev;t;;Al Qahirah
Hefei;;7j;31.86;117.28;7ay
Johannesburg;;o;-26.2;28.04;79m
Weifang;;7j;36.71;119.1;78r
Nanjing;;7j;32.06;118.78;76r
Shenyang;;7j;41.79;123.43;6zy
Foshan;;7j;23.03;113.13;6z7
London;;9c;51.51;-0.13;6wy;t
New York;;49;40.71;-74.01;6sk;;;New York City,NYC,Manhattan,Brooklyn
Jakarta;;6m;-6.21;106.85;6l8;t
Bengaluru;;6u;12.97;77.59;6jz;t;;Bangalore
Jinan;;7j;36.67;117;6g1
Hanoi;VN;63;21.02;105.84;67q;t
Taipei;;7m;25.05;121.53;62o;;;Taipei City
Lima;;3p;-12.04;-77.03;5yx
Bogotá;;27;4.61;-74.08;5x6;t
Dalian;;7j;38.91;121.6;5qz
Hong Kong;;6j;22.28;114.17;5pg;;;HK,Kowloon
Baghdad;;60;33.34;44.4;5kg
Wuzhong;;7j;37.99;106.2;5k3
Qingdao;;7j;36.06;120.38;5j8
Tehran;;7p;35.69;51.42;5ip;m
Yantai;;7j;37.48;121.44;5ha
Hyderabad;;6u;17.38;78.46;5e9;t
Rio de Janeiro;;4x;-22.91;-43.18;57g;;;Rio
Suzhou;;7j;31.3;120.6;56k;o
Zhengzhou;;7j;34.76;113.65;54r
Ahmedabad;;6u;23.03;72.59;4wm
Abidjan;;0;5.35;-4;4vl
Nanning;;7j;22.82;108.32;4m1
Kunming;;7j;25.04;102.72;4lb;m
Shijiazhuang;;7j;38.04;114.48;4fy
Changchun;;7j;43.88;125.32;4e3
Sydney;;8m;-33.87;151.21;4cn
Singapore;;7k;1.29;103.85;4cn;;;Singapura
Melbourne;;8k;-37.81;144.96;470;t
Dar es Salaam;;h;-6.82;39.27;45k
Saint Petersburg;;9j;59.94;30.31;44o;c;;St Petersburg,Sankt-Peterburg
Taiyuan;;7j;37.87;112.56;43d
Alexandria;;c;31.2;29.92;428;c
Bangkok;;63;13.75;100.5;3xs;t
Kano;;u;12;8.52;3se
Santiago;;4v;-33.46;-70.65;3qd;t
Cape Town;;o;-33.93;18.42;3ol;c;en
Peshawar;;6r;34.01;71.58;3o7
Zibo;;7j;36.79;118.06;3mo
Jeddah;;7f;21.49;39.19;3mh
Chennai;;6u;13.09;80.28;3m1;;ta;Madras
Kolkata;;6u;22.56;88.36;3kn;;;Calcutta
Xiamen;;7j;24.48;118.08;3k9
Surat;;6u;21.2;72.83;3jj
Yangzhou;;7j;32.4;119.44;3io
Huai'an;;7j;33.59;119.02;3ik
Guiyang;;7j;26.58;106.72;3h6
Yangon;;7z;16.81;96.16;3ge;t;;Rangoon
Bao'an;;7j;22.55;113.88;3gd
Kabul;;6p;34.53;69.17;3f7
Nairobi;;16;-1.28;36.82;3e5
Wuxi;;7j;31.57;120.29;3e5
Giza;;c;30.01;31.21;3db
Lanzhou;;7j;36.06;103.84;3d3
Bamako;;5;12.61;-7.98;39g
Riyadh;;7f;24.69;46.72;38u;t
Fuzhou;;7j;26.06;119.31;35q
Ürümqi;;7u;43.8;87.6;34m;d
Chattogram;;6b;22.34;91.83;30w
Addis Ababa;;2;9.02;38.75;2z8
Zaozhuang;;7j;34.86;117.55;2z4
Zhongshan;;7j;22.52;113.38;2yq
Shantou;;7j;23.35;116.68;2yn
Los Angeles;;3q;34.05;-118.24;2y5;c;;L.A.
Faisalabad;;6r;31.42;73.09;2xk
Dubai;;6d;25.08;55.31;2xa
Yokohama;;7r;35.43;139.65;2wx;c
Ningbo;;7j;29.88;121.55;2vn
Casablanca;;d;33.59;-7.61;2tu;c
Ibadan;;u;7.38;3.91;2td
Puyang;;7j;29.46;119.89;2rq
Ankara;;95;39.92;32.85;2pp
Shiyan;;7j;32.65;110.78;2o4
Hohhot;;7j;40.81;111.65;2nq
Berlin;;8s;52.52;13.41;2n6
Tangshan;;7j;39.64;118.18;2lo
Rawalpindi;;6r;33.6;73.05;2la
Lüliang;;7j;37.52;111.14;2kz
Durban;;o;-29.86;31.03;2kq;c
Anshan;;7j;41.12;122.99;2kd
Changzhou;;7j;31.77;119.95;2jf
Busan;;7i;35.1;129.03;2j9;c
Madrid;;9e;40.42;-3.7;2ig
Pyongyang;;7b;39.03;125.75;2hi
Pune;;6u;18.52;73.86;2es;;;Poona
Datong;;7j;40.09;113.29;2ea
Bursa;;95;40.2;29.06;2e6
Changsha;;7j;28.2;112.97;2dy
Quezon City;;72;14.65;121.05;2do
Jaipur;;6u;26.92;75.79;2cm
Huainan;;7j;32.63;117;2ca
Surabaya;;6m;-7.25;112.75;2bu
Incheon;;7i;37.46;126.71;2br
Haikou;;7j;20.03;110.35;2be
Caracas;;2c;10.49;-66.88;2bc;t
Kyiv;;99;50.45;30.52;2a0;;;Kiev
İzmir;;95;38.41;27.14;29m;c
Huizhou;;7j;23.11;114.42;28k
Buenos Aires;;1l;-34.61;-58.38;28b;o
Yinchuan;;7j;38.47;106.27;27f
Taichung;;7m;24.15;120.68;276
Kanpur;;6u;26.47;80.35;26f
Toronto;;5a;43.71;-79.4;25m
Quito;;34;-0.23;-78.52;25a;o
Brisbane;;8d;-27.47;153.03;258;t
Luanda;;x;-8.84;13.23;254
Baotou;;7j;40.65;109.84;24q
Osaka;;7r;34.69;135.5;24i
Linyi;;7j;35.06;118.34;248
Baoding;;7j;38.87;115.46;244
Kaohsiung;;7m;22.62;120.31;242
Brooklyn;;49;40.65;-73.95;240
Guayaquil;;34;-2.2;-79.89;23o
Belo Horizonte;;4x;-19.92;-43.94;23m
Minhang;;7j;31.11;121.37;23h
Bazhong;;7j;31.87;106.74;23d
Salvador;;20;-12.98;-38.49;23c;o
Abuja;;u;9.06;7.5;22q
Gazipur;;6b;24;90.42;22b
Chicago;;2f;41.85;-87.65;220
Wenzhou;;7j;28;120.67;21m
Bekasi;;6m;-6.23;106.99;21k
Dakar;;g;14.69;-17.44;21j
Haiphong;VN;63;20.86;106.68;20x
Yunfu;;7j;22.93;112.04;20l
Mogadishu;;14;2.04;45.34;1zv
Kumasi;;1;6.69;-1.62;1yp
Bandung;;6m;-6.92;107.61;1y8
Gujranwala;;6r;32.16;74.19;1xr
Medan;;6m;3.58;98.67;1x2
Lucknow;;6u;26.84;80.92;1wo
Xining;;7j;36.63;101.76;1wk
Ouagadougou;;1a;12.37;-1.53;1v3
Nagpur;;6u;21.15;79.08;1uu
Fortaleza;;2x;-3.72;-38.54;1uo
Cali;;27;3.43;-76.52;1uh
Perth;;8l;-31.95;115.86;1u8
Daegu;;7i;35.87;128.59;1tq
Algiers;;3;36.73;3.09;1to
Nanchang;;7j;28.68;115.85;1ti
Baku;;62;40.38;49.89;1tb;t
Nagoya;;7r;35.18;136.91;1ss
Rome;;9p;41.89;12.51;1sf;;;Roma
Queens;;49;40.68;-73.84;1sd
Houston;;2f;29.76;-95.36;1sa
Mashhad;;7p;36.3;59.61;1s3
Shaoxing;;7j;30;120.58;1rw
Nantong;;7j;32.03;120.87;1r5
Baoshan;;7j;31.41;121.49;1qy
Gaziantep;;95;37.06;37.38;1pq
Lubumbashi;;y;-11.66;27.48;1pq
Manaus;;3u;-3.1;-60.02;1po
Lusaka;;z;-15.41;28.29;1pg
Brasília;;4x;-15.78;-47.93;1pc
Zhuhai;;7j;22.28;113.57;1pb
Santo Domingo;;4w;18.47;-69.89;1p6
Lomé;;w;6.13;1.22;1os
Multan;;6r;30.2;71.48;1oa
Havana;;37;23.13;-82.38;1o4
Depok;;6m;-6.4;106.82;1o4
Ordos;;7j;39.61;109.78;1nu
Paris;;9l;48.85;2.35;1nf
Coimbatore;;6u;11.01;76.97;1nd
Qingyang;;7j;35.71;107.64;1n1
Port Harcourt;;u;4.78;7.01;1mw
Pretoria;;o;-25.74;28.19;1mp;;af
Córdoba;;1n;-31.41;-64.19;1mj
Mbuji-Mayi;;y;-6.14;23.59;1md
Aleppo;;6a;36.2;37.16;1ma
Kunshan;;7j;31.38;120.95;1m4
Zunyi;;7j;27.69;106.91;1km
La Paz;;3o;-16.5;-68.15;1jp
Lianyungang;;7j;34.6;119.22;1jl
Medellín;;27;6.25;-75.57;1jk
Puning;;7j;23.31;116.17;1jj
Indore;;6u;22.72;75.83;1je
Brazzaville;;a;-4.27;15.28;1j2
Tashkent;;7n;41.26;69.22;1iy
Ganzhou;;7j;25.85;114.93;1ix
Almaty;;5t;43.25;76.91;1ix;m;;Alma-Ata
Khartoum;;r;15.55;32.53;1iv
Hamburg;;8s;53.55;9.99;1iu;c
Sapporo;;7r;43.07;141.35;1iu;m
Songjiang;;7j;31.03;121.22;1iu
Accra;;1;5.56;-0.2;1ij
Curitiba;;4x;-25.43;-49.27;1i5
Sanaa;;5s;15.35;44.21;1ht;m
Conakry;;f;9.54;-13.68;1hk
Tangerang;;6m;-6.18;106.63;1hk
Tijuana;;59;32.5;-117;1hf
Hyderabad;;6r;25.4;68.38;1hd
Beirut;;65;33.89;35.5;1h8;c;;Beyrouth
Jieyang;;7j;23.54;116.37;1gr
Jilin;;7j;43.85;126.56;1go
Jiading;;7j;31.39;121.24;1ge
Bucharest;;8v;44.43;26.11;1g5;;;Bucuresti
Kakamega;;16;0.28;34.75;1fw
Shangqiu;;7j;34.41;115.66;1fo
Nanchong;;7j;30.8;106.08;1fn
Tainan;;7m;22.99;120.21;1fl
Kaduna;;u;10.53;7.44;1fe
Davao;;72;7.07;125.61;1fd
Thāne;;6u;19.2;72.96;1f5
Diyarbakır;;95;37.91;40.22;1ey
Santa Cruz de la Sierra;;3o;-17.79;-63.18;1ev
Vadodara;;6u;22.3;73.21;1em
Adana;;95;36.99;35.33;1eh
Nanyang;;7j;33.01;112.55;1ec
Abu Dhabi;;6d;24.45;54.4;1e7;t
Palembang;;6m;-2.92;104.75;1e1
Sharjah;;6d;25.33;55.41;1e0
Bhopal;;6u;23.25;77.4;1dy
Jiangmen;;7j;22.58;113.08;1dv
Benin City;;u;6.34;5.63;1di
Jiangyin;;7j;31.91;120.26;1dg
Fuyang;;7j;32.9;115.82;1d5
Montréal;;5a;45.51;-73.59;1cz;o;fr
Bayan Nur;;7j;40.74;107.39;1cw
Chengtangcun;;7j;35.08;117.19;1cs
Maracaibo;;2c;10.64;-71.61;1cp
Chaozhou;;7j;23.65;116.62;1cn
Minsk;;9h;53.9;27.57;1ce
Budapest;;8w;47.5;19.04;1cd
Qingyuan;;7j;23.7;113.03;1ca
Tai’an;;7j;36.19;117.12;1c7
Rasapūdipalem;;6u;17.73;83.32;1c0
Pimpri-Chinchwad;;6u;18.62;73.8;1c0
Caloocan;;72;14.65;120.97;1bl
Warsaw;;a6;52.23;21.01;1ba;t;;Warszawa
Soweto;;o;-26.27;27.86;1b3
Semarang;;6m;-6.99;110.42;1b3
Puebla;;42;19.05;-98.21;1b0
Vienna;;a3;48.21;16.37;1az;o;;Wien
Barcelona;;9e;41.39;2.16;1au;c;ca
Patna;;6u;25.59;85.14;1as
Mosul;;60;36.34;43.12;1ar
Kallakurichi;;6u;11.73;78.96;1ar
Kampala;;q;0.32;32.58;1ap
Changshu;;7j;31.65;120.74;1al
Rabat;;d;34.01;-6.83;1a0;c
Recife;;4q;-8.05;-34.88;19x
Phoenix;;4j;33.45;-112.07;19u;d
Suzhou;;7j;33.64;116.98;19s
Ecatepec de Morelos;;42;19.6;-99.06;19p
Lu’an;;7j;31.74;116.52;19o
Valencia;;2c;10.16;-68;18z
Ludhiana;;6u;30.91;75.85;18z
Yancheng;;7j;33.36;120.16;18w
Novosibirsk;;76;55.02;82.93;18t
Erbil;;60;36.19;44.01;18t
Fukuoka;;7r;33.6;130.42;18s;c
Taizhou;;7j;32.49;119.91;18n
Daqing;;7j;46.58;125;18k
Kisangani;;y;0.52;25.19;18i
Manila;;72;14.6;120.98;18g;t
Wuhu;;7j;31.35;118.43;18e
Santiago de Querétaro;;42;20.59;-100.39;18a
Dazhou;;7j;31.21;107.46;185
León de los Aldama;;42;21.12;-101.68;17w
Makkah;;7f;21.43;39.83;17v
Philadelphia;;49;39.95;-75.16;17q;o
Phnom Penh;;79;11.56;104.92;17q;t
Guilin;;7j;25.28;110.3;17o;m
Damascus;;6a;33.51;36.29;17l
Quetta;;6r;30.18;67;17i
Zhaoqing;;7j;23.05;112.46;175
Onitsha;;u;6.15;6.79;175
Mianyang;;7j;31.47;104.68;172
Auckland;;al;-36.85;174.76;16z;t
Isfahan;;7p;32.65;51.67;16z
Wanzhou;;7j;30.76;108.4;16y
Astana;;5t;51.18;71.45;16w;;;Nur-Sultan
Harare;;n;-17.83;31.05;16v
Monrovia;;15;6.3;-10.8;16v
Putian;;7j;25.44;119.01;16r
Kawasaki;;7r;35.52;139.72;16q
Goiânia;;4x;-16.68;-49.25;16o
San Antonio;;2f;29.42;-98.49;16f
Kobe;;7r;34.69;135.18;16d;c
Jinzhou;;7j;41.11;121.14;16c
Stockholm;;9x;59.33;18.07;163
Ciudad Juárez;;2h;31.72;-106.46;160
Cần Thơ;;6i;10.04;105.79;15v
Munich;;8s;48.14;11.58;15t;;;München,Muenchen
Khulna;;6b;22.81;89.56;15p
Belém;;23;-1.46;-48.5;15o
Yekaterinburg;;80;56.86;60.62;15j
Porto Alegre;;4x;-30.03;-51.23;15c
Manhattan;;49;40.78;-73.97;15c
Asunción;;1y;-25.29;-57.65;156
Zapopan;;42;20.72;-103.39;150
Makassar;;71;-5.15;119.43;14y
Adelaide;;8c;-34.93;138.6;14t
Kyoto;;7r;35.02;135.75;14o;o
Kuala Lumpur;;6w;3.14;101.69;14e
Kayseri;;95;38.73;35.49;14c
Karaj;;7p;35.83;50.99;148
Kathmandu;;6s;27.7;85.32;142;;;Katmandu
Daejeon;;7i;36.35;127.38;141
Konya;;95;37.87;32.48;13u
Agra;;6u;27.18;78.02;13q
South Tangerang;;6m;-6.29;106.72;13q
Tabriz;;7p;38.08;46.29;13l
Kharkiv;;99;49.98;36.25;13h
San Diego;;3q;32.72;-117.16;130;c
Gwangju;;7i;35.15;126.92;12x
Guadalajara;;42;20.68;-103.35;12i
The Bronx;;49;40.85;-73.87;12h
Huế;VN;63;16.46;107.6;12c;o
Milan;;9p;45.46;9.19;123;;;Milano
N'Djamena;;17;12.11;15.04;11s
Bannu;;6r;32.99;70.6;11q
Antananarivo;;a9;-18.91;47.54;11i
Douala;;j;4.05;9.7;116
Antalya;;95;36.91;30.7;113;c
Basrah;;60;30.51;47.78;10v
Dallas;;2f;32.78;-96.81;10u
Saitama;;7r;35.91;139.66;10t
Niamey;;18;13.51;2.11;10s
Taguig;;72;14.52;121.08;10c
Calgary;;2t;51.05;-114.09;10b
Tripoli;;1d;32.89;13.19;107
Medina;;7f;24.47;39.61;104;;;Madinah
Yaoundé;;j;3.87;11.52;103
Batam;;6m;1.15;104.02;101
Da Nang;;6i;16.07;108.22;zg
Amman;;5u;31.96;35.95;zg
Budta;;72;7.2;124.44;ze
Belgrade;;8r;44.8;20.47;ze;;;Beograd
Biên Hòa;;6i;10.94;106.82;zc
Kananga;;y;-5.9;22.42;zc
Montevideo;;46;-34.9;-56.19;zb
Nizhniy Novgorod;;9j;56.33;44;yz
Maputo;;11;-25.97;32.58;yv
Dammam;;7f;26.43;50.1;yt
Shiraz;;7p;29.61;52.53;yq
Kazan;;9j;55.79;49.12;yk
Barquisimeto;;2c;10.06;-69.36;yh
Shubrā al Khaymah;;c;30.13;31.25;yg
Port-au-Prince;;4k;18.54;-72.34;yb
Suwon;;7i;37.29;127.01;yb
Callao;;3p;-12.05;-77.13;y2
Karbala;;60;32.62;44.02;xv
Mombasa;;16;-4.05;39.66;xk;p
Mandalay;;7z;21.97;96.08;xk;o
Barranquilla;;27;10.97;-74.78;xi
Chelyabinsk;;80;55.16;61.43;xe
Mérida;;40;20.97;-89.62;xd
Hiroshima;;7r;34.4;132.45;xd
Shymkent;;5t;42.31;69.6;xc
Santiago de los Caballeros;;4w;19.45;-70.69;xc
Matola;;11;-25.96;32.46;xb
Arequipa;;3p;-16.4;-71.54;x8;o
Fes;;d;34.03;-5;x4;o;;Fez
Nouakchott;;19;18.09;-15.98;wx
Omsk;;77;54.99;73.37;wk
Prague;;9n;50.09;14.42;we;;;Praha
Varanasi;;6u;25.32;83.01;wc;;;Benares,Banaras
Samara;;9q;53.21;50.14;wb
Aba;;u;5.11;7.37;w8
Amritsar;;6u;31.62;74.88;w7
Birmingham;;9c;52.48;-1.9;w6
Copenhagen;;8z;55.68;12.57;w2;;;København
Sofia;;9w;42.7;23.32;w1;;;Sofiya
Yerevan;;81;40.18;44.51;vt
Kigali;;s;-1.95;30.06;vh
Rostov-on-Don;;9j;47.22;39.71;ve
Touba;;g;14.86;-15.88;v5
Ufa;;80;54.74;55.97;v5
Lilongwe;;9;-13.97;33.79;v0
Maiduguri;;u;11.85;13.16;uu
Mwanza;;h;-2.52;32.9;up
Ulsan;;7i;35.54;129.32;ui
Sendai;;7r;38.27;140.87;uh
Krasnoyarsk;;6v;56.04;92.93;ub
Oslo;;9k;59.91;10.75;u3;o
Ilorin;;u;8.5;4.54;u0
Aden;;5s;12.78;45.04;u0
Trujillo;;3p;-8.12;-79.03;to
Visakhapatnam;;6u;17.68;83.2;tj
Goyang;;7i;37.66;126.84;ti
Jodhpur;;6u;26.27;73.01;tc
Gqeberha;;o;-33.96;25.61;t6;c;en
Tbilisi;;7o;41.69;44.83;t5;t;;Tiflis
Sokoto;;u;13.06;5.24;sw
Tangier;;d;35.77;-5.8;sr;c
Mexicali;;59;32.63;-115.45;sp;d
Pointe-Noire;;a;-4.78;11.86;so
Campinas;;4x;-22.91;-47.06;so
Sanya;;7j;18.25;109.51;sn;p
Rangpur;;6b;25.75;89.25;sn
Kirkuk;;60;35.47;44.39;sn
Ashgabat;;5y;37.95;58.38;sm
Changwon;;7i;35.23;128.68;si
Cologne;;8s;50.93;6.95;sh;;;Köln,Koeln
Dublin;;90;53.33;-6.25;sg;c
Brussels;;8u;50.85;4.35;sb;;fr;Bruxelles,Brussel
Zamboanga;;72;6.91;122.07;sb
Ottawa;;5a;45.41;-75.7;s9
Edmonton;;2t;53.55;-113.47;s3
Odesa;;99;46.49;30.74;s3;c;;Odessa
San Jose;;3q;37.34;-121.89;rp
Marrakesh;;d;31.63;-8;ro;;;Marrakech
Guatemala City;;33;14.64;-90.51;rn
Esenyurt;;95;41.03;28.68;rc
Ciudad Guayana;;2c;8.35;-62.64;r6
Sargodha;;6r;32.09;72.67;r4
Managua;;3t;12.13;-86.25;r1
Jerusalem;;6o;31.77;35.22;r0;;;Yerushalayim
Chandigarh;;6u;30.74;76.79;qz
Dnipro;;99;48.47;35.04;qx
Cebu City;;72;10.32;123.89;qt
Rosario;;1n;-32.95;-60.64;qc
Taiz;;5s;13.58;44.02;q5
Kingston;;3j;18;-76.79;q2
Chihuahua;;2g;28.64;-106.09;pq;d
Nay Pyi Taw;;7z;19.75;96.13;pp
Eskişehir;;95;39.78;30.52;pm
Mysuru;;6u;12.3;76.64;pl
Seongnam;;7i;37.44;127.14;pf
Cartagena;;27;10.4;-75.49;pf;p
Antipolo;;72;14.63;121.12;pe
Sialkot;;6r;32.49;74.53;pc
Naples;;9p;40.85;14.27;p9;c;;Napoli
Bobo-Dioulasso;;1a;11.18;-4.29;p5
Blantyre;;9;-15.78;35.01;p3
Donetsk;;99;48.02;37.8;p2
Abū Ghurayb;;60;33.31;44.18;p0
Qom;;7p;34.64;50.88;p0
Bishkek;;66;42.87;74.59;p0
Natal;;2x;-5.79;-35.21;ox
Cancún;;2b;21.17;-86.85;op;p
Gurugram;;6u;28.46;77.03;on;t
Mulenvos;;x;-8.87;13.33;oi
Sulaymaniyah;;60;35.56;45.43;oe
Marseille;;9l;43.3;5.38;od;c
Soshanguve;;o;-25.47;28.1;o8
Rotterdam;;8n;51.92;4.48;o4;t
Lhasa;;7j;29.65;91.1;o4;m
Viana;;x;-8.91;13.37;o2
Johor Bahru;;6w;1.47;103.76;nu
Pasig City;;72;14.59;121.06;np
Cheongju;;7i;36.64;127.49;no
Tegucigalpa;;57;14.08;-87.21;nn
Thanh Hóa;VN;63;19.8;105.77;nm
Turin;;9p;45.07;7.69;nj;;;Torino
Al Ain;;6d;24.19;55.76;nj;;;Al Ain City
Libreville;;v;0.39;9.45;ni
Ulaanbaatar;;7t;47.91;106.88;nh;d;;Ulan Bator
Takeo;;79;10.99;104.78;ng
Cochabamba;;3o;-17.38;-66.16;nd
Ahvaz;;7p;31.32;48.68;nd
Vientiane;;7w;17.97;102.6;nd
Pietermaritzburg;;o;-29.62;30.39;nb
Kampung Baru Subang;;6w;3.15;101.53;n6
Bouaké;;0;7.69;-5.03;n4
San Francisco;;3q;37.77;-122.42;n0;c;;SF
Valencia;;9e;39.47;-0.38;mw;c
Bukavu;;y;-2.49;28.84;mp
Kraków;;a6;50.06;19.94;mp;;;Cracow
Barcelona;;2c;10.14;-64.69;mn
Bangui;;6;4.36;18.55;mk
Hermosillo;;38;29.09;-110.97;mk;d
Petaling Jaya;;6w;3.11;101.61;mg
Oran;;3;35.7;-0.64;mb
Freetown;;l;8.49;-13.24;mb
San Pedro Sula;;57;15.51;-88.03;m9
Muscat;;73;23.58;58.41;m5;o
Zarqa;;5u;32.07;36.09;m1
Kolwezi;;y;-10.71;25.47;ly
Vinh;VN;63;18.67;105.69;ly
Seattle;;3q;47.61;-122.33;lp;c
Port Said;;c;31.27;32.3;lp
Cúcuta;;27;7.91;-72.5;ll
Homs;;6a;34.72;36.73;lj
Ibb;;5s;13.97;44.18;lg
Nampula;;11;-15.12;39.27;le
Bujumbura;;b;-3.38;29.36;ld
Dodoma;;h;-6.17;35.74;l9
Rajshahi;;6b;24.37;88.6;l8
Ipoh;;6w;4.58;101.08;l4
Benghazi;;1d;32.11;20.07;l1
Winnipeg;;5e;49.88;-97.15;ku
Andijon;;7n;40.78;72.35;ks
Buraydah;;7f;26.33;43.97;kp
Riga;;9o;56.95;24.11;kn
Amsterdam;;8n;52.37;4.89;km
Cagayan de Oro;;72;8.48;124.65;km
Al Ḩudaydah;;5s;14.8;42.95;kf
Denver;;2q;39.74;-104.98;k9;m
Maianga;;x;-8.85;13.24;k8
Evaton;;o;-26.53;27.85;k5
Mississauga;;5a;43.58;-79.66;jy
Lviv;;99;49.84;24.02;jx;;;Lvov,Lwow
Namangan;;7n;41;71.67;jt
Zaporizhzhya;;99;47.85;35.12;jq
Zanzibar;;h;-6.16;39.2;jq;;;Stone Town
Latakia;;6a;35.53;35.79;jp
Santo Domingo Este;;4w;18.49;-69.85;jg
Suez;;c;29.97;32.53;jg
Agadir;;d;30.42;-9.6;je;c
Sarajevo;;9s;43.85;18.36;jd
Tunis;;1e;36.82;10.17;j9;o
Washington;;49;38.9;-77.04;j6;o;;Washington DC,Washington D.C.
Nashville;;2f;36.17;-86.78;j5
Ta’if;;7f;21.27;40.42;j5
Beira;;11;-19.84;34.84;j4
Zaragoza;;9e;41.66;-0.88;j3
Seville;;9e;37.38;-5.97;j3;;;Sevilla
Dushanbe;;6e;38.54;68.78;iv
Cotonou;;1b;6.37;2.42;iv
El Paso;;2q;31.76;-106.49;iv;d
Wrocław;;a6;51.1;17.03;ip;;;Breslau
Denpasar;;71;-8.65;115.22;im;;;Bali
Camama;;x;-8.94;13.27;ij
Tabuk;;7f;28.4;36.57;ij
Kitwe;;z;-12.8;28.21;ii
Bulawayo;;n;-20.15;28.58;ii
Athens;;8q;37.98;23.73;ig;o;;Athina
Zagreb;;a7;45.81;15.98;ig
Vancouver;;5c;49.25;-123.12;ie;c
Helsinki;;93;60.17;24.94;ib;;fi
Brampton;;5a;43.68;-79.77;i8
Golfe;;x;-8.87;13.26;i8
Soacha;;27;4.58;-74.22;i7
Boston;;49;42.36;-71.06;i6;o
Portland;;3q;45.52;-122.68;i5
Calumbo;;x;-9.15;13.42;i4
Frankfurt;;8s;50.12;8.68;i2;t;;Frankfurt am Main
Macau;;6z;22.2;113.55;i1;;;Macao
Palermo;;9p;38.12;13.36;i0;c
Colombo;;69;6.94;79.85;i0;t;si
Maturín;;2c;9.75;-63.18;hz
Detroit;;2r;42.33;-83.05;hy
Hoji ya Henda;;x;-8.81;13.29;hu
Las Vegas;;3q;36.17;-115.14;hu;d;;Vegas
Gold Coast;;8d;-28;153.43;ht;t
Łódź;;a6;51.77;19.47;hs
Al Aḩmadī;;6y;29.08;48.08;hp
Cuenca;;34;-2.9;-79;hp;o
Chisinau;;8y;47.01;28.86;ho;;;Kishinev
Likasi;;y;-10.98;26.74;ho
Comilla;;6b;23.46;91.19;hn
Tshikapa;;y;-6.42;20.8;hn
Kochi;;6u;9.94;76.26;hm;p;;Cochin
Piura;;3p;-5.18;-80.66;hi
Ndola;;z;-12.96;28.64;hg
Djibouti;;i;11.59;43.15;hf
Glasgow;;9c;55.87;-4.26;he
Al Mansurah;;c;31.04;31.38;ha
Kermanshah;;7p;34.31;47.07;h9
Düsseldorf;;8s;51.22;6.78;h7
Villa Nueva;;33;14.53;-90.59;h6
Arusha;;h;-3.37;36.68;h6;m
Stuttgart;;8s;48.78;9.18;h1
Chiclayo;;3p;-6.77;-79.85;gx
Gothenburg;;9x;57.71;11.97;gw;c;;Göteborg
Ha'il;;7f;27.52;41.69;gu
Benoni;;o;-26.19;28.32;gt
Vladivostok;;7x;43.11;131.87;gt;c
Kryvyy Rih;;99;47.91;33.39;gs
Islamabad;;6r;33.72;73.04;gq
Lubango;;x;-14.92;13.49;gp
Pokhara;;6s;28.27;83.97;go
Borama;;14;9.94;43.18;gm
Huambo;;x;-12.78;15.74;gj
Samarkand;;7h;39.65;66.96;gj
Mukalla;;5s;14.54;49.12;gj
Rasht;;7p;37.28;49.59;gj
Mar del Plata;;1l;-38;-57.56;gh
Essen;;8s;51.46;7.01;gh
Al Maḩallah al Kubrá;;c;30.97;31.17;gh
Málaga;;9e;36.72;-4.42;gg;c
Thuận An;;6i;10.92;106.71;gd
Dortmund;;8s;51.51;7.47;gc
Baltimore;;49;39.29;-76.61;ga
Bucaramanga;;27;7.13;-73.12;g5
Genoa;;9p;44.4;8.94;g4;c;;Genova
Nha Trang;;6i;12.25;109.19;g3
Malacca;;6w;2.2;102.24;g3;o;;Melaka
Kerman;;7p;30.28;57.08;g2
Orūmīyeh;;7p;37.55;45.08;g1
Tanta;;c;30.79;31;g1
Iskandar Puteri;;6w;1.39;103.62;g0
Herāt;;6p;34.35;62.2;fy
Nakuru;;16;-0.31;36.07;fv
Hamilton;;5a;43.25;-79.85;ft
Irbid;;5u;32.56;35.85;ft
Manchester;;9c;53.48;-2.24;ft
Kota Bharu;;6w;6.12;102.24;ft
Surrey;;5c;49.11;-122.83;fs
Meknes;;d;33.89;-5.55;fs
Puente Alto;;4v;-33.61;-70.58;fs
Nyala;;r;12.05;24.88;fq
Dresden;;8s;51.05;13.74;fp
Albuquerque;;2q;35.08;-106.65;fp;d
Asmara;;4;15.34;38.93;fo
Hamhŭng;;7b;39.92;127.54;fj
Nasiriyah;;60;31.06;46.26;fi
Bloemfontein;;o;-29.12;26.21;fh
Sheffield;;9c;53.38;-1.47;fh
Santiago de Cuba;;37;20.02;-75.82;fg
Benguela;;x;-12.58;13.4;ff
Banqiao;;7m;25.01;121.47;fb
Pristina;XK;8r;42.67;21.17;fa
San Miguel de Tucumán;;1v;-26.82;-65.21;f9
Kuantan;;6w;3.81;103.33;f8
Sevastopol;;9u;44.61;33.52;f8
Bremen;;8s;53.08;8.81;f7
Tucson;;4j;32.22;-110.93;f3;d
Vilnius;;a4;54.69;25.28;f2
Mbeya;;h;-8.9;33.45;f2
Oujda;;d;34.68;-1.91;f0
Leeds;;9c;53.8;-1.55;ew
Poznań;;a6;52.41;16.93;ew
Ar Raqqah;;6a;35.95;39.01;es
Quebec City;;5a;46.81;-71.21;es;o;fr;Québec
Ibagué;;27;4.44;-75.2;eq
Antwerp;;8u;51.22;4.4;ep;;;Anvers
Assiut;;c;27.18;31.18;ep
Mohammadpur;;6b;24.9;88.53;eo
Surakarta;;6m;-7.56;110.83;en
San Salvador;;2v;13.69;-89.19;em
Thủ Đức;;6i;10.85;106.77;el
Mazār-e Sharīf;;6p;36.71;67.11;ej
Kandahār;;6p;31.61;65.71;ej
Lyon;;9l;45.75;4.85;eh
Salta;;1s;-24.81;-65.42;eh;m
Al Fayyum;;c;29.31;30.84;ef
Lisbon;;9a;38.73;-9.15;ee;;;Lisboa
Nuremberg;;8s;49.45;11.08;ec
Hannover;;8s;52.37;9.73;eb
Edinburgh;;9c;55.95;-3.2;eb
Toulouse;;9l;43.6;1.44;e8
Thembisa;;o;-26;28.23;e8
Kikwit;;t;-5.04;18.82;e5
Florianópolis;;4x;-27.6;-48.55;e5
Newcastle;;8m;-32.93;151.78;e4
Tuen Mun;;6j;22.39;113.97;e4
Najrān;;7f;17.49;44.13;e2
Maipú;;4v;-33.51;-70.77;e0
Homyel';;9h;52.43;30.98;dx
Aktobe;;5x;50.28;57.21;dx
Kota Kinabalu;;6x;5.97;116.07;dw;p
Santa Marta;;27;11.24;-74.19;dv;p
Hāthazāri;;6b;22.51;91.81;du
Karagandy;;5t;49.8;73.1;du
Liverpool;;9c;53.41;-2.98;dt
Sha Tin;;6j;22.38;114.18;dr
Montería;;27;8.75;-75.88;dn
Ruiru;;16;-1.15;36.96;dm
Valledupar;;27;10.47;-73.25;dm
Ajman;;6d;25.4;55.48;dm
Port Sudan;;r;19.62;37.22;dm
Al Khuşūş;;c;30.15;31.32;dl
Jeju City;;7i;33.51;126.52;dl;;;Jeju
Gdańsk;;a6;54.35;18.65;dj;c;;Danzig
Miami;;49;25.77;-80.19;dj;c
Jijiga;;2;9.35;42.8;df
Najaf;;60;32.03;44.35;df
Bristol;;9c;51.46;-2.6;db
Hargeysa;;14;9.56;44.07;da
Taoyuan;;7m;24.99;121.3;d8
Eldoret;;16;0.52;35.27;d8
Skopje;;9v;42;21.43;d7
The Hague;;8n;52.08;4.3;d6;;;Den Haag,s-Gravenhage
Murcia;;9e;37.99;-1.13;d4
Halifax;;36;44.64;-63.58;d4;c
Morogoro;;h;-6.82;37.66;d3
Kenitra;;d;34.26;-6.58;d3
Seeb;;73;23.67;58.19;d3
Mykolayiv;;99;46.98;31.99;d2
Kanazawa;;7r;36.6;136.62;cy;o
Gonder;;2;12.6;37.47;cy
Mixco;;33;14.63;-90.61;cy
Maracay;;2c;10.25;-67.59;cx
Tamale;;1;9.4;-0.84;cw
Ḩamāh;;6a;35.13;36.76;ct
Santo Domingo de los Colorados;;34;-0.25;-79.18;cr
Ţarţūs;;6a;34.89;35.89;cq
Mek'ele;;2;13.5;39.48;cq
Nazrēt;;2;8.55;39.27;cp
Huancayo;;3p;-12.07;-75.21;co
Al Hillah;;60;32.46;44.42;co
Mbandaka;;t;0.05;18.26;cn
Namp’o;;7b;38.74;125.41;cn
Kahama;;h;-3.83;32.6;cm
Hsinchu;;7m;24.8;120.97;cm
Udaipur;;6u;24.59;73.71;cj
Warder;;2;6.97;45.34;ci
Juba;;p;4.85;31.58;ci
Constantine;;3;36.37;6.61;cg
Zhangjiajie;;7j;29.13;110.48;ca;m
Korhogo;;0;9.46;-5.63;c9
Bissau;;8;11.86;-15.6;c8
Mawlamyine;;7z;16.49;97.63;c7
Palma;;9e;39.57;2.65;c6;c;ca;Palma de Mallorca,Mallorca,Majorca
Sunch’ŏn;;7b;39.43;125.93;c5
Tel Aviv;;6o;32.08;34.78;c1;t;;Tel Aviv-Yafo
Sham Shui Po;;6j;22.33;114.16;bz
Vinnytsya;;99;49.23;28.47;by
Cusco;;3p;-13.53;-71.97;bw;m;;Cuzco
Sumgayit;;62;40.59;49.67;bv
Al Kharj;;7f;24.16;47.33;bt
Wong Tai Sin;;6j;22.35;114.18;bt
Bratislava;;8t;48.15;17.11;bs
Al Ḩasakah;;6a;36.5;40.75;bq
Luxor;;c;25.7;32.64;bq
Awasa;;2;7.06;38.48;bq
Chimoio;;11;-19.12;33.48;bq
Daloa;;0;6.88;-6.45;bq
Bamenda;;j;5.96;10.15;bo
Oakland;;3q;37.8;-122.27;bn
Christchurch;;al;-43.53;172.63;bn
Tirana;;9z;41.33;19.82;bm
San Juan;;4n;18.47;-66.11;bm
Tétouan;;d;35.58;-5.37;bk
Zürich;;a8;47.37;8.55;bj
Ciudad Bolívar;;2c;8.12;-63.55;bh
Gaza;;6g;31.5;34.47;be
Panama City;;4h;8.99;-79.52;bc;t
Cumaná;;2c;10.46;-64.18;ba
Brno;;9n;49.2;16.61;b8
Kuching;;6x;1.55;110.33;b7;p
Kassala;;r;15.45;36.4;b5
Antofagasta;;4v;-23.65;-70.4;b5
Sunshine Coast;;8d;-26.66;153.08;b3
Kisumu;;16;-0.1;34.76;b2
Luhansk;;99;48.57;39.31;b2
Barinas;;2c;8.62;-70.23;b1
Al Hoceïma;;d;35.25;-3.94;b0
Szczecin;;a6;53.43;14.55;b0
Bologna;;9p;44.49;11.34;az
Tallinn;;9y;59.44;24.75;ay
Tanga;;h;-5.07;39.1;ax
El Obeid;;r;13.18;30.22;ax
Santa Fe;;1n;-31.65;-60.71;av
San-Pédro;;0;4.75;-6.64;av
Takoradi;;1;4.9;-1.76;at
Samut Prakan;;63;13.6;100.6;at
Ambato;;34;-1.25;-78.62;ar
Windhoek;;1f;-22.56;17.08;aq
Las Palmas de Gran Canaria;;84;28.1;-15.42;ao;c;;Las Palmas,Gran Canaria
Wellington;;al;-41.29;174.78;am;c
Aswan;;c;24.09;32.9;ak
Iaşi;;8v;47.17;27.6;aj
Shibganj;;6b;25;89.32;aj
Iquitos;;3p;-3.75;-73.25;ai
Utrecht;;8n;52.09;5.12;ag
Yogyakarta;;6m;-7.8;110.36;ag;o
Bafoussam;;j;5.48;10.42;ad
Cardiff;;9c;51.48;-3.18;ac
Chitungwiza;;n;-18.01;31.08;ab
Puerto La Cruz;;2c;10.21;-64.63;aa
Bharatpur;;6s;27.68;84.44;a9
Natore;;6b;24.41;88.99;a9
Leicester;;9c;52.64;-1.13;a9
Canberra;;8m;-35.28;149.13;a8
Avellaneda;;1l;-34.66;-58.37;a8
Nara;;7r;34.69;135.8;a7;o
Florence;;9p;43.78;11.25;a7;;;Firenze
Bradford;;9c;53.79;-1.75;a6
Alanya;;95;36.54;32;a4;c
Al Qadarif;;r;14.03;35.38;a4
Hrodna;;9h;53.68;23.83;a4
New Orleans;;2f;29.95;-90.08;a3;o
Keelung;;7m;25.13;121.74;a2
Malmö;;9x;55.61;13;a2;c
Manukau City;;al;-36.99;174.88;a2
Maradi;;18;13.5;7.1;a2
Maseru;;12;-29.32;27.48;a0
Vitebsk;;9h;55.19;30.2;9z
Taraz;;5t;42.9;71.37;9y
Tete;;11;-16.16;33.59;9x
Fengshan;;7m;22.63;120.36;9w
Misratah;;1d;32.38;15.09;9w
Kyzylorda;;7e;44.85;65.51;9v
Mahilyow;;9h;53.91;30.34;9t
Ras Al Khaimah;;6d;25.79;55.94;9s
Honolulu;;ay;21.31;-157.86;9r;p
Bahir Dar;;2;11.59;37.39;9q
Quelimane;;11;-17.88;36.89;9q
Sikasso;;5;11.32;-5.67;9p
Alicante;;9e;38.35;-0.48;9p;c
Bimbo;;6;4.26;18.42;9p
Kalemyo;;7z;23.19;94.06;9p
Belfast;;9c;54.6;-5.93;9o;c
Camagüey;;37;21.38;-77.92;9o
Bilbao;;9e;43.26;-2.93;9n
Brest;;9h;52.11;23.72;9n
Central Coast;;8m;-33.43;151.37;9n
Corrientes;;1n;-27.47;-58.83;9m
Toamasina;;a9;-18.15;49.4;9l
Logan City;;8d;-27.64;153.11;9l
Kosti;;r;13.16;32.66;9l
Doha;;7c;25.29;51.53;9l;;;Qatar
Dire Dawa;;2;9.59;41.87;9j
Annaba;;3;36.9;7.77;9j
Nice;;9l;43.7;7.27;9j;c
Serekunda;;7;13.44;-16.68;9g
Kaesŏng;;7b;37.97;126.55;9e
Lublin;;a6;51.25;22.57;9c
San José;;2i;9.93;-84.08;9b
Orlando;;49;28.54;-81.38;9b
Viña del Mar;;4v;-33.02;-71.55;9a;c
Wad Medani;;r;14.4;33.52;99
Nukus;;7h;42.46;59.61;99
Blida;;3;36.47;2.83;98
Ganja;;62;40.68;46.36;97
Bonn;;8s;50.73;7.1;97
Bydgoszcz;;a6;53.12;18.01;96
Oral;;78;51.25;51.43;96
Plovdiv;;9w;42.15;24.75;95
Wŏnsan;;7b;39.15;127.44;95
Pavlodar;;5t;52.28;76.97;95
Sochi;;9j;43.6;39.72;94;c
Chipata;;z;-13.63;32.65;93
Chongjin;;7b;41.8;129.78;93
Pucallpa;;3p;-8.38;-74.55;92
Córdoba;;9e;37.89;-4.77;92
Nantes;;9l;47.22;-1.55;91
Espoo;;93;60.21;24.65;90
Kikuyu;;16;-1.25;36.66;90
Nottingham;;9c;52.95;-1.15;90
Osh;;66;40.53;72.8;8y
Portoviejo;;34;-1.06;-80.45;8y
San Miguelito;;4h;9.05;-79.47;8y
Kaech’ŏn;;7b;39.7;125.89;8w
Holguín;;37;20.89;-76.26;8v
Ust-Kamenogorsk;;5t;49.97;82.61;8v
Tsuen Wan;;6j;22.37;114.11;8v
Zinder;;18;13.81;8.99;8v
Varna;;9w;43.22;27.91;8v;c
Marne La Vallée;;9l;48.84;2.64;8u
Geita;;h;-2.87;32.23;8u
Constanţa;;8v;44.18;28.63;8u
New Delhi;;6u;28.62;77.21;8u;;;Delhi
Thessaloniki;;8q;40.64;22.93;8u;;;Salonica
Thiès;;g;14.79;-16.93;8u
Naha;;7r;26.21;127.68;8u;p
Chimbote;;3p;-9.08;-78.59;8t
Bari;;9p;41.12;16.87;8s;c
Eloy Alfaro;;34;-2.17;-79.84;8s
Maroua;;j;10.59;14.32;8q
Hull;;9c;53.74;-0.34;8q;;;Kingston upon Hull
Catania;;9p;37.49;15.07;8o;c
Sariwŏn;;7b;38.51;125.76;8m
Tabora;;h;-5.02;32.83;8l
Port-de-Paix;;4k;19.94;-72.83;8i
Posadas;;1n;-27.39;-55.92;8i
Sumbawanga;;h;-7.97;31.62;8g
Graz;;a3;47.07;15.44;8f;o
Ciudad del Este;;1y;-25.5;-54.65;8e
Solwezi;;z;-12.17;26.39;8d
Swansea;;9c;51.62;-3.94;8c;c
Newcastle;;9c;54.97;-1.61;8c;;;Newcastle upon Tyne
Winejok;;p;9.01;27.57;8c
Foz do Iguaçu;;4x;-25.55;-54.59;89
Phu Quoc;;6i;10.22;103.97;86
Bergen;;9k;60.39;5.32;86;o
Victoria;;5c;48.44;-123.35;82;c
Anchorage;;1h;61.22;-149.9;82;m
Kaunas;;a4;54.9;23.91;81
Cluj-Napoca;;8v;46.77;23.6;7z
Greensboro;;49;36.07;-79.79;7x
Haifa;;6o;32.81;35;7x;c
Aarhus;;8z;56.16;10.21;7x;c;;Århus
Brighton;;9c;50.83;-0.14;7w;c
Port Moresby;;be;-9.48;147.15;7w
Geelong;;8k;-38.15;144.36;7v
Valparaíso;;4v;-33.04;-71.63;7u;c
Bukhara;;7h;39.77;64.43;7s
Wollongong;;8m;-34.42;150.89;7s
Hakodate;;7r;41.78;140.74;7o;c
Yamoussoukro;;0;6.82;-5.28;7o
Strasbourg;;9l;48.58;7.75;7n
Baguio;;72;16.42;120.59;7l;m
Ljubljana;;9b;46.05;14.51;7k
Ha Long;VN;63;20.95;107.07;7i;;;Halong,Halong Bay
Southampton;;9c;50.9;-1.4;7i;c
Bordeaux;;9l;44.84;-0.58;7d
Ghent;;8u;51.05;3.72;7d;;;Gent
Porto-Novo;;1b;6.5;2.6;7c
Tampere;;93;61.5;23.79;79
Plymouth;;9c;50.37;-4.14;78;c
Verona;;9p;45.44;10.99;76
Da Lat;;6i;11.95;108.44;76;m
Oaxaca;;42;17.06;-96.73;73
Hobart;;8h;-42.88;147.33;73
Braşov;;8v;45.65;25.61;71;m
Porto;;9a;41.15;-8.61;71;o;;Oporto
Kiel;;8s;54.32;10.13;71;c
Montpellier;;9l;43.61;3.88;6w
Gaborone;;m;-24.65;25.91;6u
Gyeongju;;7i;35.84;129.21;6t;o
Matsumoto;;7r;36.23;137.97;6p;m
Lille;;9l;50.63;3.06;6n
Freiburg;;8s;48;7.85;6l
Podgorica;;9m;42.44;19.26;6l
Eindhoven;;8n;51.44;5.48;6k
Dali;;7j;25.58;100.21;6j;o
Georgetown;;35;6.8;-58.16;6j
Granada;;9e;37.19;-3.61;6i;m
Nassau;;48;25.06;-77.34;6c
Sucre;;3o;-19.03;-65.26;69;o
Puerto Vallarta;;42;20.62;-105.23;68;p
Cork;;90;51.9;-8.47;68;c
Paramaribo;;4i;5.87;-55.17;68
Puerto Princesa;;72;9.74;118.74;67
Sousse;;1e;35.83;10.64;66;c
Trondheim;;9k;63.43;10.4;61
Oulu;;93;65.01;25.47;60;n
Salt Lake City;;2q;40.76;-111.89;60;m
Lübeck;;8s;53.87;10.69;5w;c
Santa Cruz de Tenerife;;84;28.47;-16.25;5v;c;;Tenerife
Lijiang;;7j;26.87;100.22;5v;o
Burgas;;9w;42.51;27.47;5v;c
Hurghada;;c;27.26;33.81;5r;c
Turku;;93;60.45;22.27;5r;c
Linz;;a3;48.31;14.29;5p
Trieste;;9p;45.65;13.78;5o;c
Cabo San Lucas;;3y;22.89;-109.91;5n;p
Debrecen;;8w;47.53;21.62;5m
Geneva;;a8;46.2;6.15;5m;;fr;Genève,Genf
Townsville;;8d;-19.27;146.81;5l;p
Nicosia;;74;35.17;33.35;5k;;el
Charleroi;;8u;50.41;4.44;5k;;fr
Aberdeen;;9c;57.14;-2.1;5j;c
Rostock;;8s;54.09;12.14;5i;c
Reims;;9l;49.27;4.03;5h
Liège;;8u;50.63;5.57;5f;;fr;Luik
Braga;;9a;41.55;-8.42;5d
Providence;;49;41.82;-71.41;5b
Labuan Bajo;;71;-8.5;119.89;59
Batumi;;7o;41.64;41.63;57;c
San Sebastián;;9e;43.31;-1.97;55;c;;Donostia / San Sebastián,Donostia
Fort Lauderdale;;49;26.12;-80.14;53
Odense;;8z;55.4;10.39;51
Livingstone;;z;-17.84;25.85;4y
Basel;;a8;47.56;7.57;4y;o;;Bâle,Basle
Uppsala;;9x;59.86;17.64;4x
San Miguel de Allende;;42;20.92;-100.74;4v
Shimla;;6u;31.1;77.17;4u;m
Kamakura;;7r;35.31;139.55;4t;o
Jaffna;;69;9.67;80.01;4p;;ta
Salalah;;73;17.02;54.09;4j
Haarlem;;8n;52.38;4.64;4j
Oxford;;9c;51.75;-1.26;4i
Tauranga;;al;-37.69;176.17;4h;c
Grenoble;;9l;45.18;5.71;4f;m
George Town;;6w;5.41;100.34;4e;o;;Penang
Salzburg;;a3;47.8;13.04;4d;o
Marbella;;9e;36.52;-4.89;4c;c
York;;9c;53.96;-1.08;4c
Port Louis;;ah;-20.16;57.5;4b
Saint-Denis;;aj;-20.88;55.45;4b
Limassol;;74;34.68;33.04;4a
Cairns;;8d;-16.92;145.77;49;p
Stavanger;;9k;58.97;5.73;48;c
Regensburg;;8s;49.02;12.1;47
Dili;;6c;-8.56;125.57;46
Playa del Carmen;;2b;20.63;-87.08;46;p
Split;;a7;43.51;16.44;46;o
Cagliari;;9p;39.23;9.12;45;c
Dundee;;9c;56.47;-2.97;44
Savannah;;49;32.08;-81.1;44;o
Bridgeport;;49;41.18;-73.19;44;m
Manama;;61;26.23;50.59;43
Puerto Plata;;4w;19.79;-70.69;42
Cambridge;;9c;52.2;0.12;42
Salamanca;;9e;40.97;-5.66;41
Kelowna;;5c;49.88;-119.49;41;m
Heidelberg;;8s;49.41;8.69;3z
Norwich;;9c;52.63;1.3;3z
Coimbra;;9a;40.21;-8.42;3x;o
Darwin;;8f;-12.46;130.84;3w
Siem Reap;;79;13.36;103.86;3v;o;;Angkor
Lausanne;;a8;46.52;6.63;3v;;fr
Praia;;85;14.93;-23.51;3u
Heraklion;;8q;35.33;25.14;3t;;;Irákleion,Iraklio,Crete
San José del Cabo;;3y;23.05;-109.7;3s;p
Kutaisi;;7o;42.27;42.69;3r
Sibiu;;8v;45.8;24.15;3q
Würzburg;;8s;49.79;9.95;3q
Dunedin;;al;-45.87;170.5;3p;c
Charleston;;49;32.78;-79.93;3p;o
Innsbruck;;a3;47.26;11.39;3o
Exeter;;9c;50.72;-3.53;3n
Puno;;3p;-15.84;-70.02;3l;m
Chiang Mai;;63;18.79;98.98;3j;m
Hua Hin;;63;12.57;99.96;3i
Willemstad;;2m;12.12;-68.89;3h
Darjeeling;;6u;27.03;88.27;3g;m;;Dārjiling
Beppu;;7r;33.28;131.5;3f
Maastricht;;8n;50.85;5.69;3e
Bern;;a8;46.95;7.45;3e;o;;Berne
Bergamo;;9p;45.7;9.67;3d
Perugia;;9p;43.11;12.39;3c
Malindi;;16;-3.22;40.12;3c;p
Leiden;;8n;52.16;4.49;3c
Fujairah;;6d;25.12;56.34;3b
Reykjavík;;88;64.14;-21.9;3b
Bruges;;8u;51.21;3.22;3b;;;Brugge
Punta Arenas;;4o;-53.16;-70.91;39
Cadiz;;9e;36.53;-6.29;39;c
Pattaya;;63;12.93;100.88;38
Khiva;;7h;41.39;60.36;37;;;Xiva
Mendoza;;1q;-32.89;-68.85;37;m
Kandy;;69;7.29;80.63;34;m
Namur;;8u;50.47;4.87;33;;fr
St. John's;;51;47.56;-52.71;33;c
Pisa;;9p;43.71;10.4;32
Rijeka;;a7;45.33;14.44;30
Bolzano;;9p;46.49;11.34;2z;;de
Boulder;;2q;40.01;-105.27;2z;m
Hammamet;;1e;36.4;10.62;2y;c
Funchal;;87;32.67;-16.93;2y;p
Mostar;;9s;43.34;17.81;2x
Lincoln;;9c;53.23;-0.54;2w
Male;;ag;4.18;73.51;2w;;;Maldives
Limerick;;90;52.66;-8.62;2u
Bath;;9c;51.38;-2.36;2u
Girona;;9e;41.98;2.82;2s;;ca
Punta Cana;;4w;18.58;-68.4;2s
Niagara Falls;;5a;43.1;-79.07;2s
Santiago de Compostela;;9e;42.88;-8.55;2s
Hualien City;;7m;23.98;121.6;2r
Thimphu;;7q;27.47;89.64;2r
Bridgetown;;22;13.11;-59.62;2r
Stellenbosch;;o;-33.93;18.87;2o;;af
San Carlos de Bariloche;;1s;-41.15;-71.31;2n;m;;Bariloche
Delft;;8n;52.01;4.36;2n
Asheville;;49;35.6;-82.55;2n;m
Aqaba;;5u;29.53;35.01;2n;c
Galle;;69;6.05;80.21;2l
Nouméa;;b9;-22.27;166.45;2l
Miami Beach;;49;25.79;-80.13;2k;p
Santa Barbara;;3q;34.42;-119.7;2k;c
Tartu;;9y;58.38;26.73;2j
Launceston;;8h;-41.44;147.13;2j
Chester;;9c;53.19;-2.89;2j
Fort-de-France;;3w;14.6;-61.07;2i
Avignon;;9l;43.95;4.81;2i
Granada;;3t;11.93;-85.95;2h;o
Djerba;;1e;33.88;10.86;2h;c;;Houmt Souk
Takayama;;7r;36.13;137.25;2g;o
Santa Fe;;2q;35.69;-105.94;2g;o
Toledo;;9e;39.86;-4.02;2f
Galway;;90;53.27;-9.05;2e;c
Essaouira;;d;31.51;-9.77;2d;c
Como;;9p;45.81;9.08;2d
Derry;;9c;55;-7.31;2c;;;Londonderry
Montego Bay;;3j;18.47;-77.92;2b
Lucca;;9p;43.84;10.5;2a
Lucerne;;a8;47.05;8.31;2a;o;;Luzern
Konstanz;;8s;47.66;9.18;29
Sokcho;;7i;38.21;128.59;29;c
Napa;;3q;38.3;-122.29;28
Phuket;;63;7.89;98.4;27;;;Phuket Town
Chiang Rai;;63;19.91;99.83;27;m
Ouro Preto;;4x;-20.39;-43.51;26;o
Luleå;;9x;65.58;22.15;26;n
Nikko;;7r;36.75;139.62;26;o
Nazareth;;6o;32.7;35.3;25
Suva;;as;-18.14;178.43;25
Cozumel;;2b;20.5;-86.94;25;p
Luxembourg;;9d;49.61;6.13;25;;;Luxemburg
Mbabane;;13;-26.32;31.13;24
Nevşehir;;95;38.63;34.71;24;d;;Cappadocia,Goreme
Ubud;;71;-8.51;115.27;23;o
Moroni;;ad;-11.7;43.26;23
Cannes;;9l;43.55;7.01;23;c
Guanajuato;;42;21.02;-101.26;20
Larnaca;;74;34.92;33.63;20
Panaji;;6u;15.5;73.83;1z;p;;Panjim,Goa
Benidorm;;9e;38.54;-0.13;1y;t
Faro;;9a;37.02;-7.93;1y
Flagstaff;;4j;35.2;-111.65;1y;m
Knysna;;o;-34.04;23.05;1x;c;en
Munnar;;6u;10.09;77.06;1w;m
Jaisalmer;;6u;26.92;70.9;1w;d
Zadar;;a7;44.12;15.23;1v;o
Napier;;al;-39.49;176.91;1u;c
Rishikesh;;6u;30.11;78.29;1u;m
Rotorua;;al;-38.14;176.25;1u
Rovaniemi;;93;66.5;25.69;1u;n
Belize City;;24;17.5;-88.2;1t
Gitega;;b;-3.43;29.92;1t
Bandar Seri Begawan;;67;4.89;114.94;1s
Lugano;;a8;46.01;8.96;1r;;it
Berat;;9z;40.71;19.95;1q
Cayenne;;2d;4.94;-52.33;1q
Arrecife;;84;28.96;-13.55;1p;c;;Lanzarote
Fethiye;;95;36.64;29.13;1o;c
Trinidad;;37;21.8;-79.98;1o
Kuwait City;;6y;29.37;47.97;1o;t;;Kuwait
Ushuaia;;1w;-54.81;-68.32;1l;m
Honiara;;aw;-9.43;159.95;1k
Rhodes;;8q;36.44;28.22;1k;o
Canterbury;;9c;51.28;1.08;1j
Luang Prabang;;7w;19.89;102.15;1j;o
Mamoudzou;;ai;-12.78;45.23;1j
Nelson;;al;-41.27;173.28;1i;c
Ajaccio;;9l;41.92;8.74;1i;c
Chania;;8q;35.51;24.03;1i
Siena;;9p;43.32;11.33;1i
Évora;;9a;38.57;-7.9;1i;o
São Tomé;;1c;0.34;6.73;1h
Swakopmund;;1f;-22.68;14.53;1h;c
Ålesund;;9k;62.47;6.15;1h;c
Eilat;;6o;29.56;34.95;1g;c
Pula;;a7;44.87;13.85;1g
Jūrmala;;9o;56.97;23.77;1g
Saint John’s;;1j;17.12;-61.84;1g
El Nido;;72;11.19;119.4;1f
Venice;;9p;45.44;12.33;1f;c;;Venezia
Ayutthaya;;63;14.35;100.58;1f;o;;Phra Nakhon Si Ayutthaya
Ko Samui;;63;9.54;99.94;1e;;;Koh Samui,Samui
Ibiza;;9e;38.91;1.43;1e;c;;Eivissa
Annecy;;9l;45.91;6.13;1d;m
Port of Spain;;4l;10.67;-61.52;1d
Saipan;;bg;15.21;145.75;1c
Inverness;;9c;57.48;-4.22;1c
Durham;;9c;54.78;-1.58;1c
Palm Springs;;3q;33.83;-116.55;1b;d
Chefchaouen;;d;35.17;-5.26;1b;o
Antigua Guatemala;;33;14.56;-90.73;1a;o
Karlovy Vary;;9n;50.23;12.87;1a
Liberia;;2i;10.64;-85.44;19
Hilo;;ay;19.73;-155.09;17;p
Búzios;;4x;-22.75;-41.88;16;;;Armação dos Búzios
Nadi;;as;-17.8;177.42;16
Ohrid;;9v;41.12;20.8;16
Gutao;;7j;37.2;112.18;16;o
Tromsø;;9k;69.65;18.96;16;n
Apia;;ak;-13.83;-171.77;14
Tarawa;;bi;1.33;172.98;14
Corfu;;8q;39.62;19.92;14
Bodrum;;95;37.04;27.43;13;c
Charlottetown;;36;46.23;-63.13;13;c
Portimão;;9a;37.14;-8.54;12
Sharm el-Sheikh;;c;27.92;34.33;12;c
Stirling;;9c;56.12;-3.94;12
Leh;;6u;34.17;77.58;11;m
Banjul;;7;13.45;-16.58;11
Cascais;;9a;38.7;-9.42;10
Paphos;;74;34.78;32.42;10
Port-Vila;;aq;-17.74;168.31;10
Puerto del Rosario;;84;28.5;-13.86;10;c;;Fuerteventura
Victoria Falls;;n;-17.93;25.83;z;;;Vic Falls
Bodø;;9k;67.28;14.38;y;n
Marmaris;;95;36.85;28.27;y;c
Biarritz;;9l;43.48;-1.56;x;c
Monaco;;9i;43.74;7.42;x;t
Hoi An;;6i;15.88;108.34;x;o
Colonia del Sacramento;;46;-34.46;-57.84;w;o
Puerto Iguazú;;1n;-25.6;-54.57;w
Windsor;;9c;51.48;-0.6;w
Krabi;;63;8.07;98.91;v
Stratford-upon-Avon;;9c;52.19;-1.71;u
Kuah;;6w;6.33;99.84;u;p
Kuta;;71;-8.72;115.17;u;;;Seminyak
Oranjestad;;1x;12.52;-70.03;u
George Town;;2e;19.29;-81.37;t
Bethlehem;;6h;31.7;35.2;t
Monterey;;3q;36.6;-121.89;s;c
Saint Helier;;96;49.19;-2.1;s;;;St Helier,Jersey
Zakopane;;a6;49.3;19.95;r;m
Taupo;;al;-38.68;176.08;r
Dubrovnik;;a7;42.64;18.11;r;o;;Ragusa
Gibraltar;;91;36.14;-5.35;r
Ocho Rios;;3j;18.41;-77.1;r
Papeete;;bh;-17.53;-149.57;q
Kahului;;ay;20.89;-156.47;q;p;;Maui
Douglas;;94;54.15;-4.48;q
Sintra;;9a;38.8;-9.38;q;o
Garmisch-Partenkirchen;;8s;47.49;11.1;q;m
Montreux;;a8;46.43;6.91;q;;fr
Alice Springs;;8f;-23.7;133.88;q;d
Key West;;49;24.56;-81.78;q;c
Majuro;;b3;7.09;171.38;p
Vang Vieng;;7w;18.92;102.45;p
Kingstown;;55;13.16;-61.23;p
Victoria;;af;-4.62;55.46;n
El Calafate;;1r;-50.34;-72.28;n;m
Sarandë;;9z;39.88;20;n
Sliema;;9f;35.91;14.5;n
Nuku‘alofa;;bj;-21.14;-175.2;m
South Lake Tahoe;;3q;38.93;-119.98;m;m;;Tahoe
Pushkar;;6u;26.49;74.55;m;d
Kilkenny;;90;52.65;-7.25;m
Flores;;33;16.92;-89.9;k
Andorra la Vella;;8o;42.51;1.52;k
Newquay;;9c;50.42;-5.07;k;c
Ponta Delgada;;82;37.74;-25.67;k;p
Varadero;;37;23.16;-81.24;k;p
Castries;;53;14;-61.01;k
Charlotte Amalie;;54;18.34;-64.93;k
Penzance;;9c;50.12;-5.54;k;c
Dalaman;;95;36.77;28.8;j
Kos;;8q;36.89;27.29;j
Akureyri;;88;65.68;-18.09;j
Puerto Natales;;4o;-51.73;-72.51;j
Tulum;;2b;20.21;-87.46;i;p
Budva;;9m;42.29;18.84;i
San Pedro;;24;17.92;-87.97;h
Kiruna;;9x;67.86;20.23;h;n
Scarborough;;4l;11.18;-60.74;h
Roseau;;2s;15.3;-61.39;h
Saint Peter Port;;92;49.46;-2.54;g
Albufeira;;9a;37.09;-8.25;g
Paraty;;4x;-23.22;-44.71;f;o
Nuuk;;4f;64.18;-51.72;f
Belmopan;;24;17.25;-88.76;d
Avarua;;bf;-21.21;-159.78;d
Tórshavn;;86;62.01;-6.77;d
Basseterre;;52;17.3;-62.72;d
Pago Pago;;ba;-14.28;-170.7;c
Basse-Terre;;32;16;-61.73;b
Mariehamn;;9g;60.1;19.93;b
Kralendijk;;3n;12.15;-68.27;b
Road Town;;5b;18.43;-64.62;8
Saint George's;;31;12.05;-61.75;8
Palikir;;bd;6.92;158.16;7
Valletta;;9f;35.9;14.51;7;o
Funafuti;;at;-8.52;179.19;6
Saint-Pierre;;43;46.78;-56.18;6
Gustavia;;50;17.9;-62.85;6
Marigot;;3v;18.07;-63.08;6
Vaduz;;a1;47.14;9.52;5
San Marino;;9r;43.94;12.45;5
Cockburn Town;;30;21.46;-71.14;4
Longyearbyen;;5r;78.22;15.65;2
Stanley;;8b;-51.69;-57.86;2
The Valley;;1i;18.22;-63.06;2
Ciudad de la Paz;;10;1.59;10.82;2
Philipsburg;;3r;18.03;-63.05;1
Flying Fish Cove;;ab;-10.42;105.68;1
Mata-Utu;;bl;-13.28;-176.17;1
Yaren;;b6;-0.55;166.93;1
Hagåtña;;ax;13.48;144.75;1;;;Guam
Hamilton;;83;32.29;-64.78;1
Kingston;;b8;-29.05;167.97;1
Vatican City;;a2;41.9;12.45;1
Jamestown;;8a;-15.92;-5.72;1
Alofi;;b7;-19.05;-169.92;1
West Island;;ac;-12.16;96.82;0
Adamstown;;bc;-25.07;-130.1;0
Port-aux-Français;;ae;-49.35;70.22;0
Grytviken;;89;-54.28;-36.51;0
Plymouth;;47;16.71;-62.21;0
Ngerulmud;;bb;7.5;134.62;0
Airlie Beach;;8d;-20.27;148.72;0;p
Amalfi;;9p;40.63;14.6;0;c
Aspen;;2q;39.19;-106.82;0;m
Ayia Napa;;6f;34.99;34;0
Bagan;;7z;21.17;94.86;0;o
Banff;;2t;51.18;-115.57;0;m
Bar Harbor;;49;44.39;-68.2;0;c
Bled;;9b;46.37;14.11;0;m
Bocas del Toro;;4h;9.34;-82.24;0
Boracay;;72;11.97;121.92;0
Broome;;8l;-17.96;122.24;0;d
Byron Bay;;8d;-28.64;153.61;0
Carmel-by-the-Sea;;3q;36.56;-121.92;0;c
Chamonix;;9l;45.92;6.87;0;m
Dahab;;c;28.5;34.51;0;c
Ella;;69;6.87;81.05;0;m
Fira;;8q;36.42;25.43;0;;;Santorini,Thira
Hakone;;7r;35.23;139.11;0;m
Interlaken;;a8;46.69;7.86;0
Jasper;;2t;52.87;-118.08;0;m
Kailua-Kona;;ay;19.64;-155.99;0;p;;Kona
Keswick;;9c;54.6;-3.13;0
Kotor;;9m;42.42;18.77;0;o
Lahaina;;ay;20.88;-156.68;0;p;;Maui
Mdina;;9f;35.89;14.4;0;o
Mykonos;;8q;37.45;25.33;0;;;Mikonos
Nafplio;;8q;37.57;22.8;0;o
Negril;;3j;18.27;-78.35;0
Paro;;7q;27.43;89.42;0
Piran;;9b;45.53;13.57;0
Port Douglas;;8d;-16.48;145.46;0;p
Provincetown;;49;42.05;-70.19;0;c
Puerto Ayora;;34;-0.74;-90.31;0;p;;Galapagos
Punta del Este;;46;-34.96;-54.95;0
Queenstown;;al;-45.03;168.66;0
Roatán;;57;16.32;-86.54;0
Sa Pa;VN;63;22.34;103.84;0;m;;Sapa
San Pedro de Atacama;;4v;-22.91;-68.2;0
Sedona;;4j;34.87;-111.76;0;m
Sorrento;;9p;40.63;14.38;0;c
St. Moritz;;a8;46.5;9.84;0
Tamarindo;;2i;10.3;-85.84;0
Uyuni;;3o;-20.46;-66.83;0
Wadi Musa;;5u;30.32;35.48;0;;;Petra
Wanaka;;al;-44.7;169.13;0
Whistler;;5c;50.12;-122.95;0;m
Zakynthos;;8q;37.79;20.9;0
Zermatt;;a8;46.02;7.75;0
Český Krumlov;;9n;48.81;14.32;0`,
  airports: 'AAEn2 AANdb AARoz ABB8b ABJ1i ABQhg ABV46 ABZqo ACC61 ACEv9 ADB3l ADD2k ADEbe ADJ9z ADL91 AEP3n AERnk AESvq AEYya AGAet AGPgt AGR99 AGTol AKL8d AKXir ALA5w ALCmo ALG4r ALP5l AMD1h AMM9z AMSef ANCou ANFl2 ANUvu AOEci AOG34 APLe5 APWwg AQJtm AQPap ARN8p ASBbt ASEzr ASMhh ASPxn ASR94 ASU8y ASWll ATHfb ATQax ATZi4 AUAx7 AUH6p AVLtl AVNtv AVV1p AWAkl AWZdg AXAz7 AYT9n BAHrs BAQai BAV3v BBU6c BCN7e BDAze BDO4g BDQ6m BEGa1 BEL8u BENea BER2z BEWez BEY68 BFNhk BFSmr BGFdq BGIth BGOos BGW18 BGYsl BHBzv BHDmr BHKp4 BHO6s BHXay BIOmt BIQwx BJLn4 BJMe6 BJS3 BJVwj BJX83 BKIis BKK1u BKO2f BLAdp BLQl9 BLR10 BLZcq BMA8p BMEzz BNAex BNE3t BODpd BOG15 BOJqd BOMe BONyt BOOwv BOSfi BOYcp BQTmu BRCtj BREht BRIoa BRMaa BRNsk BRSj9 BRUbx BSB56 BSLr0 BSR9o BSZcu BTH9x BTSki BUD73 BUE3n BUH6c BUQfa BUR2o BUSqv BVA5e BWIgw BWNv5 BZEv3 BZV5t BZX44 CAGro CAIq CAN4 CATwq CAYv8 CBBdf CBRly CCKzj CCS3j CCU22 CDG5e CEBcc CEIuc CEKaj CFUwi CGHf CGKz CGNbv CGO1g CGP2j CGQ1m CGYeg CHCkq CHI48 CHQvl CHSsa CIA4v CITam CIXgc CJB5f CJJd7 CJS8q CJUj4 CKG1 CKY64 CLJow CLO4o CMBfo CMN2t CMWms CNDo4 CNF42 CNSri CNXse COKg1 COOf3 COR5j COV6n CPHaz CPT1x CRLbx CSWqi CSX3c CTAoe CTGcl CTS5z CTU2 CUNcw CURsg CUUcg CUZke CWB62 CWLls CXRgz CZLk4 CZMui CZX35 DACl DAD9y DAL9p DAM88 DAR1q DAT3a DBVxe DCAew DEBqj DELo5 DENei DFW9p DIAn0 DILrl DIRn1 DIY6k DJEtx DLA9m DLC16 DLIpj DLMy8 DMBmd DMEk DMK1u DMMa7 DNDrp DODe7 DOHn0 DPSf6 DRShf DRWs0 DSN5d DSS4b DTMgv DTTfq DTWfq DUBbw DUDs9 DUR33 DUSg8 DVO6i DWC2q DXB2q DYGk5 DYUf2 DZAvi EBB7i EBL7u ECNqm EDIih EDLjc EINpw EISyu ELPf4 ELQed EMAns ESB2w ESUu2 ETMvr EVNb1 EWRy EYWxo EZE3n FAEyo FAOut FBM53 FCO4v FDFtu FDHu8 FEZaq FIH6 FJRsp FKI7y FLGuu FLLqx FLNil FLRm1 FNAdu FNCt5 FNJ38 FOC2h FOR4n FRAfl FSCvk FSPyz FTExt FUEwt FUK7v FUNyy GBEpq GCIyi GCMx8 GDL9f GDNj5 GDTz4 GEOpy GHVpm GIBxf GIDv4 GIG1e GLAg5 GMPm GNBra GNDyv GNJnd GOAgy GOHyl GOIur GOJa5 GOTgd GOXur GROtb GRUf GRXpz GRZok GSOox GUAc4 GUMzd GVAqk GYD4t GYE41 GYN8l GZT52 HAHun HAJig HAK3i HAM5y HAN12 HASge HAV5b HBApl HBE1t HEAh5 HELfe HERs4 HET2y HFAoy HFEr HGAja HGHh HHNfl HHQsf HIA26 HIJal HIRve HKDp6 HKG17 HKTub HLAs HLEzh HLPz HMOdr HNDo HNLmk HOGnx HOU4x HPH4c HRBn HRE8h HRGqe HSG7v HUI9h HUNtf HWR7r HYD1d IADew IAH4x IASlm IBA2u IBZvz ICNm IDR5s IFN8e IGRx1 IGUoq IKA1b ILRbd INC3o INNsb INUzc IOMxj IPHe9 IQTlo ISBgi IST7 ITM3w ITOwa IUEzi IXBsh IXCca IXLwo JAFr5 JAI3e JCL111 JDHbi JED20 JFKy JHBd5 JHM10c JIBg4 JIJj7 JKTz JMK10e JNBs JROga JTR105 JUBk3 JUJic JULsd KAD6h KAN1v KBL2a KBVx3 KCHl0 KCTtn KDHia KEFsq KERh1 KGAa3 KGFiv KGLb2 KGSy9 KHH3z KHIi KHN4s KIKbs KINcf KISl4 KIX3w KJAbb KLOzy KLVw8 KMG1k KMQjl KMS4f KNO4i KNU3q KOA109 KRKdo KRNyf KRT5x KTI86 KTM96 KUFav KUL93 KUNov KUTs6 KWE27 KWIvc KWL87 KYA98 KZNa9 KZOmh LAD3u LASfs LAX2o LBAhy LBCqa LBVdc LCAuq LCJfu LCYx LED1r LFW59 LGAy LGB2o LGKx5 LGWx LHEc LHRx LHW2e LILpt LIM14 LIN9i LIRw9 LISie LJGqc LJUpa LKO4j LLAue LLV32 LLWb6 LNZqg LONx LOS8 LPAlj LPB5o LPLiw LPQvh LRMtc LTNx LUN55 LUXuj LUZn6 LVIqz LXAd3 LXRkk LYG5p LYP2p LYSib MAA21 MAD37 MAJxp MANh9 MAO54 MAR70 MBAag MBJu5 MCOn8 MCTdw MCYl3 MDE5q MDLah MDW48 MDZsw MED9v MEL1p MEXg MFMfm MGAc8 MGQ4e MHD4y MIAj6 MIDak MIL9i MIUb7 MJI9u MJM5k MLAyx MLEt8 MMJps MMXm8 MNIzn MNL7z MOWk MPLpp MPMa6 MRSd0 MRUrf MRYxa MSQ72 MSTsj MSUmb MSYm6 MUC8s MUX5a MVDa4 MWX9e MWZb8 MXLbn MXP9i MYDsn MZRi9 NAG4m NANwc NAPco NASq0 NATcv NAVul NBJ3u NBO2b NCEn3 NCLoo NCUnb NCYw0 NDJ9j NGB2s NGO4u NIM9r NJFj8 NKCar NKGu NLAg3 NLUg NMAen NMIe NNG1j NOUto NPEuz NQYy2 NQZ8g NRTo NSI9w NSNvj NTEnp NTLim NUEif NYCy NYO8p NYTch OAKkp OAXpk ODEqy OGGxi OHDwd OKAo8 OMOt6 OMSas ONT2o OOLft OPOpn ORD48 ORKq3 ORNdt ORY5e OSA3w OSLbc OSSnt OSTsr OTP6c OUA4l OUDhx OULq8 OVB7t OXBk7 PAPac PAR5e PAT7f PBC7c PBH10h PBMq4 PCLnn PDLy3 PDP10m PDVnh PDXfj PEGsm PEK3 PENrb PER4p PEW1y PFOwr PHC5h PHHgk PHL85 PHX7m PIKg5 PKX3 PLM6q PLZbj PMIk9 PMOfn PMVky PNQ39 PNRbo PNTyb POA8w POMp1 POPrt POSw1 POZhz PPGyq PPSq5 PPTxh PQCor PRGat PRMwl PRNhp PSAt0 PSDe1 PSPw5 PTPyr PTYkx PUJtc PUQss PUS36 PUYvs PVDqt PVG0 PVRq2 PWQnj PYK95 PZOc6 PZUj2 QRO81 RAIs3 RAKc3 RARyn RBA7k REC7l REKsq RESmw RGN28 RHOvf RIO1e RIXee RIYgo RJKt1 RKTmj RKVsq RMLfo RMOfx RMQ3p RMUjf ROB8i ROM4v RORzo ROScd ROTv1 RTB10o RTMd2 RUH2g RUNrg RVNv2 SAFtz SAH63 SAIs1 SALi7 SAN9d SAOf SAPdv SAT8m SAVrq SAW7 SBAtq SBHz0 SBZs7 SCL1w SCQte SCUhm SDJba SDQ58 SDU1e SEAe0 SELm SENx SEZxs SFBn8 SFOdl SGN9 SHA0 SHEv SHJ6r SHOuk SIN1o SJCc2 SJDs5 SJJeu SJOn7 SJUks SJW1l SKByp SKDgn SKGo6 SKObl SKPjd SKTcn SLAic SLCq9 SLLr6 SLMrv SNA2o SNNt9 SOCi6 SOFb0 SOUpc SPK5z SPRye SPUrn SPXq SREq1 SRG7b SSA45 SSHwm STIan STNx STO8p STRgb STTy6 STV24 SUB3g SUVuh SVDxr SVGrj SVOk SVQf1 SVX8v SWA2n SXBp8 SXMz9 SYD1n SYXbq SYZa8 SZB93 SZGrc SZX5 SZZl8 TAByg TAE4q TAO1a TAS5u TAYtr TBSbk TBUxw TBZ9b TETme TFNqb TFSqb TFU2 TGDpv THR1b TIAkr TIFey TIJ66 TKUqf TLCg TLLla TLSii TLVkb TMLjp TMMmx TMPpg TMSvo TNA11 TNDvb TNGbm TNN6g TNR9l TOSwf TPE13 TQOyc TRDq7 TRFbc TRGr9 TRNda TRSqh TRUbf TRWwh TSA13 TSFvw TSNa TSVql TTUkt TUChq TUNev TUOxd TUShu TUUf8 TYN1s TYOo UBNdd UDRk1 UET89 UFAb5 UGCsv UIO3s UKB8n UKKny UPG90 URAng URC2i USHvd USMvy USNb9 UTPsu UVFy5 UYU10v VARo1 VCA8r VCEvw VCPbp VFAwu VIE7d VKOk VLCdm VLIws VLN7q VNOhv VNSau VRAy4 VRNpi VTEdh VTZbg VVI6l VVOgg WASew WAW79 WDHli WHA80 WKA10x WLGlk WLSzb WMI79 WMT5n WNZ49 WROf5 WUHb WUX2c WVBvp XCHza XIYd XMN23 XNN4k XPLd8 YEGc0 YHMh7 YHZjg YIAlq YIW2v YLWrw YMQ6x YNT1c YNYu9 YNZ7s YOWbz YQBi1 YTO3r YTY25 YTZ3r YUL6x YVRfd YWGeb YYC9t YYGwk YYJot YYTsz YYZ3r ZADuy ZAGfc ZAMby ZAZf0 ZIAk ZNZep ZQN10n ZRHku ZSErg ZTH10z ZUH57',
};

/* ---------- the tables as objects, parsed on first use (a few ms, once) ---------- */
const _TRD_AREAS = { A: 'Africa', M: 'America', N: 'Antarctica', R: 'Arctic', S: 'Asia', T: 'Atlantic', U: 'Australia', E: 'Europe', I: 'Indian', P: 'Pacific' };
/** Place kinds (travel spec 4.6): they pick the moments' generated scene and the small motif. */
const TR_KIND_NAMES = Object.freeze({ t: 'towers', o: 'oldtown', c: 'coastal', m: 'mountain', d: 'desert', p: 'tropical', n: 'nordic', l: 'lowlands' });
const _TRD_SPECIAL = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'Đ': 'd', 'ł': 'l', 'Ł': 'l', 'ı': 'i', 'œ': 'oe', 'Œ': 'oe', 'þ': 'th', 'Þ': 'th', 'ð': 'd', 'Ð': 'd', 'ħ': 'h' };
let _trdTables = null;
/** ASCII-folded lower-case words: 'Zürich' -> 'zurich', 'Kraków' -> 'krakow' (tools/build-travel-data.mjs folds the same way). */
function trdFold(s) {
  return String(s == null ? '' : s).replace(/[ßæÆøØđĐłŁıœŒþÞðÐħ]/g, c => _TRD_SPECIAL[c]).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[‘’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function _trdZone(p) { const a = _TRD_AREAS[p.charAt(0)]; return a && p.charAt(1) === '/' ? a + p.slice(1) : p; }
/**
 * The offline tables as objects (built once):
 *   countries {CC: {cc, ccy, langs[], plugs, left, emergency, weekend[], kind, capital, flag}}
 *   cities    [{id, name, cc, zone, lat, lon, pop, kind, lang, aliases[]}], biggest first
 *   zones     {zone: {cc, lat, lon, city}}      links {oldName: zone}
 *   airports  {IATA: cityId}                    states [cc] (the zone is the city)
 *   byId      Map cityId -> city
 * City ids are the folded name and the country ('tokyo-jp', 'new-york-us'); a smaller
 * namesake in the same country also gets its row number. trPlaceIndexFromData
 * (69-travel-logic.js) makes the same ids.
 */
function trPlaceTables() {
  if (_trdTables) return _trdTables;
  const R = TR_DATA_RAW, n36 = (s) => parseInt(s, 36);
  const countries = {};
  for (const row of R.countries.split('\n')) {
    const f = row.split(';');
    countries[f[0]] = { cc: f[0], ccy: f[1] || '', langs: f[2] ? f[2].split(',') : [], plugs: f[3] || '', left: f[4] === 'L', emergency: f[5] || '',
      weekend: (f[6] || '60').split('').map(Number), kind: TR_KIND_NAMES[f[7]] || '', capital: f[8] || '', flag: f[9] || '' };
  }
  const zoneRows = R.zones.split('\n').map(r => r.split(';'));
  const cities = [], byId = new Map();
  for (const row of R.cities.split('\n')) {
    const f = row.split(';');
    const z = zoneRows[n36(f[2])];
    const cc = f[1] || z[1];
    let id = (trdFold(f[0]).replace(/ /g, '-') || 'place') + '-' + cc.toLowerCase();
    if (byId.has(id)) id += '-' + cities.length.toString(36);   // same rule as trPlaceIndexFromData (69-travel-logic.js)
    const c = { id, name: f[0], cc, zone: _trdZone(z[0]), lat: Number(f[3]), lon: Number(f[4]), pop: n36(f[5] || '0') * 1000,
      kind: TR_KIND_NAMES[f[6]] || (countries[cc] ? countries[cc].kind : '') || 'oldtown', lang: f[7] || '', aliases: f[8] ? f[8].split(',') : [] };
    cities.push(c); byId.set(id, c);
  }
  for (const k in countries) { const i = countries[k].capital; countries[k].capital = i ? cities[n36(i)].id : ''; }
  const zones = {};
  for (const z of zoneRows) zones[_trdZone(z[0])] = { cc: z[1], lat: Number(z[2]), lon: Number(z[3]), city: z[4] ? cities[n36(z[4])].id : '' };
  const links = {};
  for (const p of R.links.split(' ')) { if (!p) continue; const i = p.indexOf('>'); links[_trdZone(p.slice(0, i))] = _trdZone(zoneRows[n36(p.slice(i + 1))][0]); }
  const airports = {};
  for (const p of R.airports.split(' ')) if (p) airports[p.slice(0, 3)] = cities[n36(p.slice(3))].id;
  _trdTables = { version: R.version, countries, cities, zones, links, airports, states: R.states.split(' '), byId };
  return _trdTables;
}
/** The tables in the shape trPlaceIndexFromData (69-travel-logic.js) reads; parsed on first use. */
const TR_DATA = Object.freeze({
  get version() { return TR_DATA_RAW.version; },
  get countries() { return trPlaceTables().countries; },
  get cities() { return trPlaceTables().cities; },
  get zones() { return trPlaceTables().zones; },
  get links() { return trPlaceTables().links; },
  get airports() { return trPlaceTables().airports; },
});
