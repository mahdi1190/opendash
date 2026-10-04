/* ============================================================
   UK COUNTIES (v2.2 wave 3): a small OFFLINE table of the main UK towns and
   the area each sits in, for the opt-in regional animations (the UK packs,
   72-anim-pack-uk-<region>.js). PURE classic script: no DOM, no fetches.
     England           the 47 ceremonial counties (the City of London folded
                       into Greater London)
     Scotland          the 32 council areas
     Wales             the 22 principal areas
     Northern Ireland  the 6 counties
   Each area: [id, name, nation (ISO 3166-2), pack region, 'Town lat lon; ...',
   welcome name (optional, for "Welcome to ...")]. Positions are town centres to
   two decimals, compiled from open government data (ONS geography and OS Open
   Names, Open Government Licence v3.0; see THIRD_PARTY_NOTICES.md). Main towns
   only: the nearest town decides the area, so places near a border can land on
   the neighbour. Nothing here is personal or fetched.
     ukCountyNearest(lat, lon, maxKm=40)  {id, name, welcome, nation, region, town, km} | null
     ukCounty(id)                         the area record or null
     ukCountiesIn(region)                 the areas of a pack region
     UK_REGIONS                           the 12 pack regions, in batch order
   ============================================================ */
const UK_REGIONS = [
  { id: 'south-west', name: 'South West', nation: 'GB-ENG' },
  { id: 'south-east', name: 'South East', nation: 'GB-ENG' },
  { id: 'london', name: 'London', nation: 'GB-ENG' },
  { id: 'east', name: 'East of England', nation: 'GB-ENG' },
  { id: 'east-midlands', name: 'East Midlands', nation: 'GB-ENG' },
  { id: 'west-midlands', name: 'West Midlands', nation: 'GB-ENG' },
  { id: 'north-west', name: 'North West', nation: 'GB-ENG' },
  { id: 'yorkshire', name: 'Yorkshire and the Humber', nation: 'GB-ENG' },
  { id: 'north-east', name: 'North East', nation: 'GB-ENG' },
  { id: 'wales', name: 'Wales', nation: 'GB-WLS' },
  { id: 'scotland', name: 'Scotland', nation: 'GB-SCT' },
  { id: 'northern-ireland', name: 'Northern Ireland', nation: 'GB-NIR' },
];
const _UK_ROWS = [
  /* ---------- England: South West ---------- */
  ['cornwall', 'Cornwall', 'GB-ENG', 'south-west', 'Truro 50.26 -5.05; Penzance 50.12 -5.54; St Ives 50.21 -5.48; Falmouth 50.15 -5.07; Newquay 50.41 -5.08; Bodmin 50.47 -4.72; St Austell 50.34 -4.79; Redruth 50.23 -5.23; Camborne 50.21 -5.30; Bude 50.83 -4.54; Launceston 50.64 -4.36; Liskeard 50.45 -4.47; Padstow 50.54 -4.94; Helston 50.10 -5.27; Looe 50.35 -4.45; Fowey 50.34 -4.64; Saltash 50.41 -4.21; Tintagel 50.66 -4.75; St Just 50.12 -5.68; Hugh Town 49.91 -6.31'],
  ['devon', 'Devon', 'GB-ENG', 'south-west', 'Exeter 50.72 -3.53; Plymouth 50.38 -4.14; Torquay 50.46 -3.53; Paignton 50.44 -3.56; Barnstaple 51.08 -4.06; Bideford 51.02 -4.21; Ilfracombe 51.21 -4.12; Tavistock 50.55 -4.14; Okehampton 50.74 -4.00; Tiverton 50.90 -3.49; Exmouth 50.62 -3.41; Totnes 50.43 -3.68; Dartmouth 50.35 -3.58; Newton Abbot 50.53 -3.61; Honiton 50.80 -3.19; Sidmouth 50.68 -3.24; Kingsbridge 50.28 -3.78; Brixham 50.39 -3.51; Lynton 51.23 -3.83; Princetown 50.54 -3.99; Crediton 50.79 -3.65; Great Torrington 50.95 -4.14; Holsworthy 50.81 -4.35; South Molton 51.02 -3.83; Axminster 50.78 -3.00'],
  ['dorset', 'Dorset', 'GB-ENG', 'south-west', 'Dorchester 50.71 -2.44; Bournemouth 50.72 -1.88; Poole 50.72 -1.98; Weymouth 50.61 -2.46; Bridport 50.73 -2.76; Lyme Regis 50.73 -2.94; Sherborne 50.95 -2.52; Shaftesbury 51.01 -2.20; Blandford Forum 50.86 -2.16; Wimborne Minster 50.80 -1.99; Swanage 50.61 -1.96; Wareham 50.69 -2.11; Christchurch 50.73 -1.78; Gillingham 51.04 -2.28; Sturminster Newton 50.93 -2.31; Portland 50.55 -2.44; Verwood 50.88 -1.87'],
  ['somerset', 'Somerset', 'GB-ENG', 'south-west', 'Taunton 51.02 -3.10; Bath 51.38 -2.36; Wells 51.21 -2.65; Weston-super-Mare 51.35 -2.98; Yeovil 50.94 -2.63; Bridgwater 51.13 -3.00; Glastonbury 51.15 -2.71; Frome 51.23 -2.32; Minehead 51.20 -3.47; Street 51.13 -2.74; Shepton Mallet 51.19 -2.55; Chard 50.87 -2.96; Burnham-on-Sea 51.24 -2.99; Cheddar 51.28 -2.78; Clevedon 51.44 -2.85; Portishead 51.48 -2.77; Keynsham 51.41 -2.50; Midsomer Norton 51.28 -2.48; Wellington 50.98 -3.23; Dulverton 51.04 -3.55; Wincanton 51.06 -2.41; Crewkerne 50.88 -2.80; Ilminster 50.93 -2.91'],
  ['bristol', 'Bristol', 'GB-ENG', 'south-west', 'Bristol 51.45 -2.59; Avonmouth 51.50 -2.70; Bedminster 51.44 -2.60'],
  ['gloucestershire', 'Gloucestershire', 'GB-ENG', 'south-west', 'Gloucester 51.86 -2.24; Cheltenham 51.90 -2.08; Cirencester 51.72 -1.97; Stroud 51.75 -2.22; Tewkesbury 51.99 -2.16; Stow-on-the-Wold 51.93 -1.72; Chipping Campden 52.05 -1.78; Bourton-on-the-Water 51.89 -1.76; Coleford 51.79 -2.62; Cinderford 51.82 -2.50; Lydney 51.73 -2.53; Yate 51.54 -2.42; Thornbury 51.61 -2.52; Tetbury 51.64 -2.16; Moreton-in-Marsh 51.99 -1.70; Dursley 51.68 -2.35; Newent 51.93 -2.40; Winchcombe 51.95 -1.97; Filton 51.51 -2.58'],
  ['wiltshire', 'Wiltshire', 'GB-ENG', 'south-west', 'Salisbury 51.07 -1.79; Swindon 51.56 -1.78; Trowbridge 51.32 -2.21; Chippenham 51.46 -2.12; Marlborough 51.42 -1.73; Devizes 51.35 -1.99; Warminster 51.20 -2.18; Malmesbury 51.58 -2.10; Bradford-on-Avon 51.35 -2.25; Amesbury 51.17 -1.78; Calne 51.44 -2.00; Corsham 51.43 -2.19; Melksham 51.37 -2.14; Pewsey 51.34 -1.77; Tidworth 51.24 -1.66; Westbury 51.26 -2.19; Mere 51.09 -2.27; Royal Wootton Bassett 51.54 -1.90'],
  /* ---------- England: South East ---------- */
  ['kent', 'Kent', 'GB-ENG', 'south-east', 'Canterbury 51.28 1.08; Maidstone 51.27 0.52; Dover 51.13 1.31; Folkestone 51.08 1.17; Margate 51.39 1.39; Ramsgate 51.34 1.42; Ashford 51.15 0.87; Tunbridge Wells 51.13 0.26; Sevenoaks 51.27 0.19; Chatham 51.38 0.53; Rochester 51.39 0.50; Gravesend 51.44 0.37; Dartford 51.45 0.22; Whitstable 51.36 1.03; Faversham 51.32 0.89; Sittingbourne 51.34 0.73; Deal 51.22 1.40; Hythe 51.07 1.08; Tenterden 51.07 0.69; Tonbridge 51.20 0.27; New Romney 50.99 0.94'],
  ['east-sussex', 'East Sussex', 'GB-ENG', 'south-east', 'Brighton 50.82 -0.14; Hove 50.83 -0.17; Eastbourne 50.77 0.28; Hastings 50.86 0.57; Lewes 50.87 0.01; Rye 50.95 0.73; Bexhill-on-Sea 50.84 0.47; Uckfield 50.97 0.10; Crowborough 51.06 0.16; Battle 50.92 0.48; Newhaven 50.79 0.05; Seaford 50.77 0.10'],
  ['west-sussex', 'West Sussex', 'GB-ENG', 'south-east', 'Chichester 50.84 -0.78; Worthing 50.81 -0.37; Crawley 51.11 -0.19; Horsham 51.06 -0.33; Bognor Regis 50.78 -0.68; Littlehampton 50.81 -0.54; Haywards Heath 51.00 -0.10; Arundel 50.85 -0.55; Midhurst 50.99 -0.74; East Grinstead 51.13 -0.01; Shoreham-by-Sea 50.83 -0.27'],
  ['surrey', 'Surrey', 'GB-ENG', 'south-east', 'Guildford 51.24 -0.57; Woking 51.32 -0.56; Reigate 51.24 -0.21; Epsom 51.33 -0.27; Farnham 51.21 -0.80; Camberley 51.34 -0.74; Dorking 51.23 -0.33; Godalming 51.19 -0.61; Staines-upon-Thames 51.43 -0.51; Leatherhead 51.30 -0.33; Haslemere 51.09 -0.71; Redhill 51.24 -0.17; Weybridge 51.37 -0.46'],
  ['hampshire', 'Hampshire', 'GB-ENG', 'south-east', 'Winchester 51.06 -1.31; Southampton 50.90 -1.40; Portsmouth 50.80 -1.09; Basingstoke 51.27 -1.09; Andover 51.21 -1.48; Aldershot 51.25 -0.76; Farnborough 51.29 -0.75; Fareham 50.85 -1.18; Petersfield 51.00 -0.94; Lymington 50.76 -1.55; Romsey 50.99 -1.50; Alton 51.15 -0.97; Ringwood 50.85 -1.79; Lyndhurst 50.87 -1.58; Havant 50.86 -0.98; Gosport 50.79 -1.13; Fleet 51.28 -0.84; Eastleigh 50.97 -1.35; Yateley 51.34 -0.83; Hook 51.28 -0.96; Hartley Wintney 51.30 -0.90; Whitchurch 51.23 -1.34'],
  ['isle-of-wight', 'Isle of Wight', 'GB-ENG', 'south-east', 'Newport 50.70 -1.29; Ryde 50.73 -1.16; Cowes 50.76 -1.30; Sandown 50.65 -1.15; Ventnor 50.59 -1.21; Shanklin 50.63 -1.18; Yarmouth 50.71 -1.50; Freshwater 50.68 -1.53', 'the Isle of Wight'],
  ['berkshire', 'Berkshire', 'GB-ENG', 'south-east', 'Reading 51.45 -0.97; Slough 51.51 -0.59; Windsor 51.48 -0.61; Maidenhead 51.52 -0.72; Newbury 51.40 -1.32; Bracknell 51.41 -0.75; Wokingham 51.41 -0.83; Hungerford 51.41 -1.51; Thatcham 51.40 -1.26; Eton 51.49 -0.61'],
  ['oxfordshire', 'Oxfordshire', 'GB-ENG', 'south-east', 'Oxford 51.75 -1.26; Banbury 52.06 -1.34; Bicester 51.90 -1.15; Abingdon 51.67 -1.28; Witney 51.79 -1.48; Didcot 51.61 -1.24; Henley-on-Thames 51.54 -0.90; Wantage 51.59 -1.43; Chipping Norton 51.94 -1.55; Thame 51.75 -0.98; Wallingford 51.60 -1.13; Burford 51.81 -1.64; Woodstock 51.85 -1.35'],
  ['buckinghamshire', 'Buckinghamshire', 'GB-ENG', 'south-east', 'Aylesbury 51.82 -0.81; High Wycombe 51.63 -0.75; Milton Keynes 52.04 -0.76; Amersham 51.67 -0.61; Buckingham 52.00 -0.99; Beaconsfield 51.61 -0.64; Marlow 51.57 -0.78; Chesham 51.71 -0.61; Olney 52.15 -0.70; Princes Risborough 51.72 -0.83'],
  /* ---------- England: London ---------- */
  ['greater-london', 'Greater London', 'GB-ENG', 'london', 'City of London 51.52 -0.09; Westminster 51.50 -0.13; Camden 51.54 -0.14; Croydon 51.37 -0.10; Bromley 51.41 0.02; Richmond upon Thames 51.46 -0.30; Kingston upon Thames 51.41 -0.30; Harrow 51.58 -0.34; Enfield 51.65 -0.08; Barnet 51.65 -0.20; Ilford 51.56 0.07; Romford 51.58 0.18; Uxbridge 51.55 -0.48; Greenwich 51.48 0.00; Stratford 51.54 0.00; Wimbledon 51.42 -0.21; Bexleyheath 51.46 0.14; Hounslow 51.47 -0.36; Ealing 51.51 -0.30; Sutton 51.36 -0.19', 'London'],
  /* ---------- England: East of England ---------- */
  ['norfolk', 'Norfolk', 'GB-ENG', 'east', 'Norwich 52.63 1.30; King\'s Lynn 52.75 0.40; Great Yarmouth 52.61 1.73; Cromer 52.93 1.30; Thetford 52.41 0.75; Dereham 52.68 0.94; Wells-next-the-Sea 52.95 0.85; Fakenham 52.83 0.85; North Walsham 52.82 1.39; Hunstanton 52.94 0.49; Swaffham 52.65 0.69; Diss 52.38 1.11'],
  ['suffolk', 'Suffolk', 'GB-ENG', 'east', 'Ipswich 52.06 1.16; Bury St Edmunds 52.25 0.71; Lowestoft 52.48 1.75; Felixstowe 51.96 1.35; Sudbury 52.04 0.73; Newmarket 52.24 0.41; Aldeburgh 52.15 1.60; Southwold 52.33 1.68; Stowmarket 52.19 1.00; Woodbridge 52.09 1.32; Haverhill 52.08 0.44'],
  ['cambridgeshire', 'Cambridgeshire', 'GB-ENG', 'east', 'Cambridge 52.21 0.12; Peterborough 52.57 -0.24; Ely 52.40 0.26; Huntingdon 52.33 -0.18; St Neots 52.23 -0.27; Wisbech 52.66 0.16; March 52.55 0.09; St Ives 52.33 -0.08'],
  ['essex', 'Essex', 'GB-ENG', 'east', 'Chelmsford 51.74 0.47; Colchester 51.89 0.90; Southend-on-Sea 51.54 0.71; Basildon 51.58 0.49; Harlow 51.77 0.09; Clacton-on-Sea 51.79 1.16; Brentwood 51.62 0.31; Saffron Walden 52.02 0.24; Harwich 51.94 1.28; Maldon 51.73 0.68; Grays 51.48 0.33; Braintree 51.88 0.55; Epping 51.70 0.11'],
  ['hertfordshire', 'Hertfordshire', 'GB-ENG', 'east', 'St Albans 51.75 -0.34; Watford 51.66 -0.40; Hertford 51.80 -0.08; Stevenage 51.90 -0.20; Hemel Hempstead 51.75 -0.47; Hitchin 51.95 -0.28; Letchworth 51.98 -0.23; Bishop\'s Stortford 51.87 0.16; Welwyn Garden City 51.80 -0.20; Tring 51.79 -0.66; Royston 52.05 -0.02'],
  ['bedfordshire', 'Bedfordshire', 'GB-ENG', 'east', 'Bedford 52.14 -0.47; Luton 51.88 -0.42; Dunstable 51.89 -0.52; Leighton Buzzard 51.92 -0.66; Biggleswade 52.09 -0.26; Ampthill 52.03 -0.50'],
  /* ---------- England: East Midlands ---------- */
  ['derbyshire', 'Derbyshire', 'GB-ENG', 'east-midlands', 'Derby 52.92 -1.48; Chesterfield 53.24 -1.42; Buxton 53.26 -1.91; Matlock 53.14 -1.55; Bakewell 53.21 -1.68; Glossop 53.44 -1.95; Ilkeston 52.97 -1.31; Ashbourne 53.02 -1.73; Swadlincote 52.77 -1.56; Castleton 53.34 -1.78'],
  ['nottinghamshire', 'Nottinghamshire', 'GB-ENG', 'east-midlands', 'Nottingham 52.95 -1.15; Mansfield 53.14 -1.20; Newark-on-Trent 53.08 -0.81; Worksop 53.30 -1.12; Retford 53.32 -0.94; Southwell 53.08 -0.96'],
  ['leicestershire', 'Leicestershire', 'GB-ENG', 'east-midlands', 'Leicester 52.64 -1.13; Loughborough 52.77 -1.21; Hinckley 52.54 -1.37; Melton Mowbray 52.77 -0.89; Market Harborough 52.48 -0.92; Coalville 52.72 -1.37; Lutterworth 52.46 -1.20'],
  ['rutland', 'Rutland', 'GB-ENG', 'east-midlands', 'Oakham 52.67 -0.73; Uppingham 52.59 -0.72'],
  ['northamptonshire', 'Northamptonshire', 'GB-ENG', 'east-midlands', 'Northampton 52.24 -0.90; Kettering 52.40 -0.73; Corby 52.49 -0.69; Wellingborough 52.30 -0.69; Daventry 52.26 -1.16; Brackley 52.03 -1.15; Towcester 52.13 -0.99; Oundle 52.48 -0.47'],
  ['lincolnshire', 'Lincolnshire', 'GB-ENG', 'east-midlands', 'Lincoln 53.23 -0.54; Grimsby 53.57 -0.08; Scunthorpe 53.59 -0.65; Boston 52.98 -0.03; Grantham 52.91 -0.64; Skegness 53.14 0.34; Louth 53.37 0.00; Spalding 52.79 -0.15; Stamford 52.65 -0.48; Sleaford 53.00 -0.41; Gainsborough 53.40 -0.77; Mablethorpe 53.34 0.26; Horncastle 53.21 -0.11; Market Rasen 53.39 -0.34; Cleethorpes 53.56 -0.03; Brigg 53.55 -0.49'],
  /* ---------- England: West Midlands ---------- */
  ['west-midlands', 'West Midlands', 'GB-ENG', 'west-midlands', 'Birmingham 52.48 -1.90; Coventry 52.41 -1.51; Wolverhampton 52.59 -2.13; Dudley 52.51 -2.08; Walsall 52.59 -1.98; Solihull 52.41 -1.78; West Bromwich 52.52 -1.99; Sutton Coldfield 52.57 -1.82', 'the West Midlands'],
  ['staffordshire', 'Staffordshire', 'GB-ENG', 'west-midlands', 'Stoke-on-Trent 53.00 -2.18; Stafford 52.81 -2.12; Lichfield 52.68 -1.83; Tamworth 52.63 -1.69; Burton upon Trent 52.80 -1.64; Newcastle-under-Lyme 53.01 -2.23; Leek 53.10 -2.02; Cannock 52.69 -2.03; Uttoxeter 52.90 -1.86; Stone 52.90 -2.15'],
  ['shropshire', 'Shropshire', 'GB-ENG', 'west-midlands', 'Shrewsbury 52.71 -2.75; Telford 52.68 -2.45; Oswestry 52.86 -3.05; Ludlow 52.37 -2.72; Bridgnorth 52.53 -2.42; Market Drayton 52.90 -2.48; Whitchurch 52.97 -2.68; Church Stretton 52.54 -2.80; Bishop\'s Castle 52.49 -3.00'],
  ['herefordshire', 'Herefordshire', 'GB-ENG', 'west-midlands', 'Hereford 52.06 -2.72; Leominster 52.23 -2.74; Ross-on-Wye 51.91 -2.58; Ledbury 52.04 -2.42; Kington 52.20 -3.03'],
  ['worcestershire', 'Worcestershire', 'GB-ENG', 'west-midlands', 'Worcester 52.19 -2.22; Kidderminster 52.39 -2.25; Redditch 52.31 -1.94; Bromsgrove 52.34 -2.06; Malvern 52.11 -2.33; Evesham 52.09 -1.95; Droitwich Spa 52.27 -2.15; Pershore 52.11 -2.08'],
  ['warwickshire', 'Warwickshire', 'GB-ENG', 'west-midlands', 'Warwick 52.28 -1.58; Leamington Spa 52.29 -1.54; Stratford-upon-Avon 52.19 -1.71; Rugby 52.37 -1.26; Nuneaton 52.52 -1.47; Kenilworth 52.34 -1.58; Shipston-on-Stour 52.06 -1.62; Atherstone 52.58 -1.55'],
  /* ---------- England: North West ---------- */
  ['cumbria', 'Cumbria', 'GB-ENG', 'north-west', 'Carlisle 54.89 -2.94; Kendal 54.33 -2.75; Penrith 54.66 -2.75; Keswick 54.60 -3.13; Whitehaven 54.55 -3.59; Workington 54.64 -3.55; Barrow-in-Furness 54.11 -3.23; Windermere 54.38 -2.91; Ambleside 54.43 -2.96; Cockermouth 54.66 -3.36; Ulverston 54.19 -3.09; Appleby-in-Westmorland 54.58 -2.49; Kirkby Stephen 54.47 -2.35; Wigton 54.82 -3.16; Brampton 54.94 -2.73; Millom 54.21 -3.27; Sedbergh 54.32 -2.53'],
  ['lancashire', 'Lancashire', 'GB-ENG', 'north-west', 'Preston 53.76 -2.70; Lancaster 54.05 -2.80; Blackpool 53.82 -3.05; Blackburn 53.75 -2.48; Burnley 53.79 -2.24; Morecambe 54.07 -2.86; Chorley 53.65 -2.63; Clitheroe 53.87 -2.39; Accrington 53.75 -2.36; Ormskirk 53.57 -2.89; Fleetwood 53.92 -3.01; Lytham St Annes 53.75 -2.99; Carnforth 54.13 -2.77; Nelson 53.83 -2.22'],
  ['greater-manchester', 'Greater Manchester', 'GB-ENG', 'north-west', 'Manchester 53.48 -2.24; Salford 53.49 -2.29; Bolton 53.58 -2.43; Wigan 53.55 -2.63; Stockport 53.41 -2.16; Oldham 53.54 -2.12; Rochdale 53.62 -2.16; Bury 53.59 -2.30; Altrincham 53.39 -2.35; Ashton-under-Lyne 53.49 -2.10'],
  ['merseyside', 'Merseyside', 'GB-ENG', 'north-west', 'Liverpool 53.41 -2.98; Birkenhead 53.39 -3.01; Southport 53.65 -3.01; St Helens 53.45 -2.74; Bootle 53.45 -2.99; Wallasey 53.42 -3.05; Formby 53.56 -3.07'],
  ['cheshire', 'Cheshire', 'GB-ENG', 'north-west', 'Chester 53.19 -2.89; Crewe 53.10 -2.44; Macclesfield 53.26 -2.13; Warrington 53.39 -2.59; Northwich 53.26 -2.52; Widnes 53.36 -2.73; Runcorn 53.34 -2.73; Ellesmere Port 53.28 -2.90; Nantwich 53.07 -2.52; Knutsford 53.30 -2.37; Congleton 53.16 -2.21; Wilmslow 53.33 -2.23'],
  /* ---------- England: Yorkshire and the Humber ---------- */
  ['north-yorkshire', 'North Yorkshire', 'GB-ENG', 'yorkshire', 'York 53.96 -1.08; Harrogate 53.99 -1.54; Scarborough 54.28 -0.40; Whitby 54.49 -0.61; Northallerton 54.34 -1.43; Richmond 54.40 -1.74; Ripon 54.14 -1.52; Skipton 53.96 -2.02; Selby 53.78 -1.07; Thirsk 54.23 -1.34; Malton 54.14 -0.80; Pickering 54.25 -0.78; Settle 54.07 -2.28; Hawes 54.30 -2.20; Leyburn 54.31 -1.83; Helmsley 54.25 -1.06; Middlesbrough 54.58 -1.23; Redcar 54.62 -1.07; Guisborough 54.54 -1.05'],
  ['west-yorkshire', 'West Yorkshire', 'GB-ENG', 'yorkshire', 'Leeds 53.80 -1.55; Bradford 53.79 -1.75; Wakefield 53.68 -1.50; Huddersfield 53.65 -1.78; Halifax 53.72 -1.86; Keighley 53.87 -1.91; Dewsbury 53.69 -1.63; Pontefract 53.69 -1.31; Hebden Bridge 53.74 -2.01; Ilkley 53.93 -1.82; Otley 53.90 -1.69; Holmfirth 53.57 -1.79'],
  ['south-yorkshire', 'South Yorkshire', 'GB-ENG', 'yorkshire', 'Sheffield 53.38 -1.47; Doncaster 53.52 -1.13; Rotherham 53.43 -1.36; Barnsley 53.55 -1.48; Penistone 53.53 -1.63; Thorne 53.61 -0.96'],
  ['east-riding', 'East Riding of Yorkshire', 'GB-ENG', 'yorkshire', 'Kingston upon Hull 53.74 -0.33; Beverley 53.84 -0.43; Bridlington 54.08 -0.19; Goole 53.70 -0.87; Driffield 54.01 -0.44; Hornsea 53.91 -0.17; Withernsea 53.73 0.03; Pocklington 53.93 -0.78', 'the East Riding of Yorkshire'],
  /* ---------- England: North East ---------- */
  ['northumberland', 'Northumberland', 'GB-ENG', 'north-east', 'Alnwick 55.41 -1.71; Berwick-upon-Tweed 55.77 -2.01; Hexham 54.97 -2.10; Morpeth 55.17 -1.69; Blyth 55.13 -1.51; Cramlington 55.08 -1.59; Ashington 55.18 -1.57; Haltwhistle 54.97 -2.46; Rothbury 55.31 -1.91; Bellingham 55.14 -2.25; Wooler 55.55 -2.01'],
  ['tyne-and-wear', 'Tyne and Wear', 'GB-ENG', 'north-east', 'Newcastle upon Tyne 54.98 -1.61; Sunderland 54.91 -1.38; Gateshead 54.95 -1.60; South Shields 55.00 -1.43; North Shields 55.01 -1.45; Washington 54.90 -1.52'],
  ['durham', 'County Durham', 'GB-ENG', 'north-east', 'Durham 54.78 -1.57; Darlington 54.52 -1.55; Hartlepool 54.69 -1.21; Stockton-on-Tees 54.57 -1.32; Bishop Auckland 54.66 -1.68; Consett 54.85 -1.83; Barnard Castle 54.54 -1.92; Peterlee 54.76 -1.33; Stanhope 54.75 -2.01; Chester-le-Street 54.86 -1.57'],
  /* ---------- Wales: the 22 principal areas ---------- */
  ['blaenau-gwent', 'Blaenau Gwent', 'GB-WLS', 'wales', 'Ebbw Vale 51.78 -3.21; Tredegar 51.77 -3.25; Abertillery 51.73 -3.13'],
  ['bridgend', 'Bridgend', 'GB-WLS', 'wales', 'Bridgend 51.50 -3.58; Porthcawl 51.48 -3.70; Maesteg 51.61 -3.66'],
  ['caerphilly', 'Caerphilly', 'GB-WLS', 'wales', 'Caerphilly 51.57 -3.22; Blackwood 51.67 -3.20; Ystrad Mynach 51.64 -3.24; Rhymney 51.76 -3.28; Risca 51.61 -3.10'],
  ['cardiff', 'Cardiff', 'GB-WLS', 'wales', 'Cardiff 51.48 -3.18; Llandaff 51.49 -3.22'],
  ['carmarthenshire', 'Carmarthenshire', 'GB-WLS', 'wales', 'Carmarthen 51.86 -4.31; Llanelli 51.68 -4.16; Ammanford 51.79 -3.99; Llandovery 51.99 -3.80; Llandeilo 51.88 -3.99; Newcastle Emlyn 52.04 -4.47; Laugharne 51.77 -4.46; Kidwelly 51.74 -4.30'],
  ['ceredigion', 'Ceredigion', 'GB-WLS', 'wales', 'Aberystwyth 52.42 -4.08; Cardigan 52.08 -4.66; Lampeter 52.11 -4.08; Aberaeron 52.24 -4.26; New Quay 52.21 -4.36; Tregaron 52.22 -3.93; Borth 52.49 -4.05'],
  ['conwy', 'Conwy', 'GB-WLS', 'wales', 'Conwy 53.28 -3.83; Llandudno 53.32 -3.83; Colwyn Bay 53.29 -3.73; Abergele 53.28 -3.58; Llanrwst 53.14 -3.79; Betws-y-Coed 53.09 -3.80; Cerrigydrudion 53.03 -3.56'],
  ['denbighshire', 'Denbighshire', 'GB-WLS', 'wales', 'Denbigh 53.18 -3.42; Rhyl 53.32 -3.49; Ruthin 53.11 -3.31; Llangollen 52.97 -3.17; Prestatyn 53.34 -3.41; Corwen 52.98 -3.38; St Asaph 53.26 -3.44'],
  ['flintshire', 'Flintshire', 'GB-WLS', 'wales', 'Mold 53.17 -3.14; Flint 53.25 -3.13; Buckley 53.17 -3.08; Holywell 53.27 -3.22; Connah\'s Quay 53.22 -3.06'],
  ['gwynedd', 'Gwynedd', 'GB-WLS', 'wales', 'Caernarfon 53.14 -4.27; Bangor 53.23 -4.13; Dolgellau 52.74 -3.88; Pwllheli 52.89 -4.42; Porthmadog 52.93 -4.13; Bala 52.91 -3.60; Barmouth 52.72 -4.05; Blaenau Ffestiniog 52.99 -3.94; Tywyn 52.59 -4.09; Llanberis 53.12 -4.13; Aberdaron 52.80 -4.71; Harlech 52.86 -4.11; Beddgelert 53.01 -4.10'],
  ['anglesey', 'Isle of Anglesey', 'GB-WLS', 'wales', 'Llangefni 53.26 -4.31; Holyhead 53.31 -4.63; Beaumaris 53.26 -4.09; Amlwch 53.41 -4.34; Menai Bridge 53.23 -4.16', 'Anglesey'],
  ['merthyr-tydfil', 'Merthyr Tydfil', 'GB-WLS', 'wales', 'Merthyr Tydfil 51.75 -3.38'],
  ['monmouthshire', 'Monmouthshire', 'GB-WLS', 'wales', 'Monmouth 51.81 -2.72; Abergavenny 51.82 -3.02; Chepstow 51.64 -2.67; Usk 51.70 -2.90; Caldicot 51.59 -2.75'],
  ['neath-port-talbot', 'Neath Port Talbot', 'GB-WLS', 'wales', 'Neath 51.66 -3.81; Port Talbot 51.59 -3.78; Pontardawe 51.72 -3.85; Glynneath 51.75 -3.62'],
  ['newport', 'Newport', 'GB-WLS', 'wales', 'Newport 51.59 -3.00; Caerleon 51.61 -2.96'],
  ['pembrokeshire', 'Pembrokeshire', 'GB-WLS', 'wales', 'Haverfordwest 51.80 -4.97; Pembroke 51.68 -4.92; Tenby 51.67 -4.70; Milford Haven 51.71 -5.03; Fishguard 51.99 -4.98; St Davids 51.88 -5.27; Narberth 51.80 -4.74; Newport 52.02 -4.84; Crymych 51.97 -4.65'],
  ['powys', 'Powys', 'GB-WLS', 'wales', 'Brecon 51.95 -3.39; Newtown 52.51 -3.31; Welshpool 52.66 -3.15; Llandrindod Wells 52.24 -3.38; Machynlleth 52.59 -3.85; Builth Wells 52.15 -3.40; Hay-on-Wye 52.07 -3.13; Crickhowell 51.86 -3.14; Knighton 52.34 -3.05; Rhayader 52.30 -3.51; Llanidloes 52.45 -3.54; Ystradgynlais 51.78 -3.75; Llanfyllin 52.77 -3.27; Presteigne 52.27 -3.01; Llanwrtyd Wells 52.11 -3.64; Sennybridge 51.94 -3.56; Llanwddyn 52.76 -3.46'],
  ['rhondda-cynon-taf', 'Rhondda Cynon Taf', 'GB-WLS', 'wales', 'Pontypridd 51.60 -3.34; Aberdare 51.71 -3.45; Treorchy 51.66 -3.51; Tonypandy 51.62 -3.45; Llantrisant 51.54 -3.37; Mountain Ash 51.68 -3.38'],
  ['swansea', 'Swansea', 'GB-WLS', 'wales', 'Swansea 51.62 -3.94; Mumbles 51.57 -3.99; Gorseinon 51.67 -4.04; Rhossili 51.57 -4.29'],
  ['torfaen', 'Torfaen', 'GB-WLS', 'wales', 'Pontypool 51.70 -3.04; Cwmbran 51.65 -3.02; Blaenavon 51.78 -3.08'],
  ['vale-of-glamorgan', 'Vale of Glamorgan', 'GB-WLS', 'wales', 'Barry 51.40 -3.27; Penarth 51.44 -3.17; Cowbridge 51.46 -3.45; Llantwit Major 51.41 -3.49', 'the Vale of Glamorgan'],
  ['wrexham', 'Wrexham', 'GB-WLS', 'wales', 'Wrexham 53.05 -2.99; Chirk 52.93 -3.06; Gresford 53.09 -2.97; Overton 52.97 -2.94'],
  /* ---------- Scotland: the 32 council areas ---------- */
  ['aberdeen', 'Aberdeen City', 'GB-SCT', 'scotland', 'Aberdeen 57.15 -2.09', 'Aberdeen'],
  ['aberdeenshire', 'Aberdeenshire', 'GB-SCT', 'scotland', 'Peterhead 57.51 -1.80; Fraserburgh 57.69 -2.00; Inverurie 57.28 -2.38; Stonehaven 56.96 -2.21; Banff 57.67 -2.52; Ellon 57.37 -2.07; Huntly 57.45 -2.79; Ballater 57.05 -3.04; Braemar 57.01 -3.40; Banchory 57.05 -2.49; Turriff 57.54 -2.46; Alford 57.23 -2.70'],
  ['angus', 'Angus', 'GB-SCT', 'scotland', 'Forfar 56.64 -2.89; Arbroath 56.56 -2.58; Montrose 56.71 -2.47; Brechin 56.73 -2.66; Kirriemuir 56.68 -3.00; Carnoustie 56.50 -2.71'],
  ['argyll-and-bute', 'Argyll and Bute', 'GB-SCT', 'scotland', 'Oban 56.41 -5.47; Campbeltown 55.43 -5.61; Dunoon 55.95 -4.93; Helensburgh 56.00 -4.73; Inveraray 56.23 -5.07; Lochgilphead 56.04 -5.43; Rothesay 55.84 -5.06; Tobermory 56.62 -6.07; Bowmore 55.76 -6.29; Tarbert 55.86 -5.41'],
  ['clackmannanshire', 'Clackmannanshire', 'GB-SCT', 'scotland', 'Alloa 56.12 -3.79; Tillicoultry 56.15 -3.74'],
  ['dumfries-and-galloway', 'Dumfries and Galloway', 'GB-SCT', 'scotland', 'Dumfries 55.07 -3.61; Stranraer 54.90 -5.02; Castle Douglas 54.94 -3.93; Annan 54.99 -3.26; Lockerbie 55.12 -3.35; Kirkcudbright 54.84 -4.05; Newton Stewart 54.96 -4.48; Moffat 55.33 -3.44; Sanquhar 55.37 -3.92; Langholm 55.15 -3.00; Gretna 55.00 -3.06; Wigtown 54.87 -4.44'],
  ['dundee', 'Dundee City', 'GB-SCT', 'scotland', 'Dundee 56.46 -2.97', 'Dundee'],
  ['east-ayrshire', 'East Ayrshire', 'GB-SCT', 'scotland', 'Kilmarnock 55.61 -4.50; Cumnock 55.45 -4.26'],
  ['east-dunbartonshire', 'East Dunbartonshire', 'GB-SCT', 'scotland', 'Kirkintilloch 55.94 -4.15; Bearsden 55.92 -4.33; Milngavie 55.94 -4.32'],
  ['east-lothian', 'East Lothian', 'GB-SCT', 'scotland', 'Haddington 55.96 -2.78; North Berwick 56.06 -2.72; Dunbar 56.00 -2.52; Musselburgh 55.94 -3.05'],
  ['east-renfrewshire', 'East Renfrewshire', 'GB-SCT', 'scotland', 'Newton Mearns 55.77 -4.33; Barrhead 55.80 -4.39; Giffnock 55.80 -4.29'],
  ['edinburgh', 'City of Edinburgh', 'GB-SCT', 'scotland', 'Edinburgh 55.95 -3.19; Leith 55.98 -3.17; South Queensferry 55.99 -3.40', 'Edinburgh'],
  ['falkirk', 'Falkirk', 'GB-SCT', 'scotland', 'Falkirk 56.00 -3.78; Grangemouth 56.01 -3.72; Bo\'ness 56.02 -3.61'],
  ['fife', 'Fife', 'GB-SCT', 'scotland', 'Kirkcaldy 56.11 -3.16; Dunfermline 56.07 -3.46; St Andrews 56.34 -2.80; Glenrothes 56.20 -3.17; Cupar 56.32 -3.01; Anstruther 56.22 -2.70; Burntisland 56.06 -3.23; Leven 56.20 -3.00'],
  ['glasgow', 'Glasgow City', 'GB-SCT', 'scotland', 'Glasgow 55.86 -4.25', 'Glasgow'],
  ['highland', 'Highland', 'GB-SCT', 'scotland', 'Inverness 57.48 -4.22; Fort William 56.82 -5.11; Aviemore 57.19 -3.83; Thurso 58.59 -3.52; Wick 58.44 -3.09; Ullapool 57.90 -5.16; Portree 57.41 -6.19; Dingwall 57.60 -4.43; Nairn 57.58 -3.87; Kyle of Lochalsh 57.28 -5.71; Mallaig 57.00 -5.83; Durness 58.57 -4.75; Lairg 58.02 -4.40; Dornoch 57.88 -4.03; Golspie 57.97 -3.98; Helmsdale 58.12 -3.65; Gairloch 57.73 -5.69; Kingussie 57.08 -4.05; Fort Augustus 57.14 -4.68; Lochinver 58.15 -5.24; Tongue 58.48 -4.42; Strontian 56.70 -5.57; Grantown-on-Spey 57.33 -3.61; Invergordon 57.69 -4.17; Broadford 57.24 -5.91; Applecross 57.43 -5.81; Glencoe 56.68 -5.10; Kinlochleven 56.71 -4.97; Bettyhill 58.53 -4.24; Dunbeath 58.25 -3.43; Achnasheen 57.58 -5.08', 'the Highlands'],
  ['inverclyde', 'Inverclyde', 'GB-SCT', 'scotland', 'Greenock 55.95 -4.76; Gourock 55.96 -4.82; Port Glasgow 55.93 -4.69'],
  ['midlothian', 'Midlothian', 'GB-SCT', 'scotland', 'Dalkeith 55.89 -3.07; Penicuik 55.83 -3.22; Bonnyrigg 55.87 -3.10'],
  ['moray', 'Moray', 'GB-SCT', 'scotland', 'Elgin 57.65 -3.32; Forres 57.61 -3.61; Buckie 57.68 -2.96; Lossiemouth 57.72 -3.29; Keith 57.54 -2.95; Dufftown 57.45 -3.13; Tomintoul 57.25 -3.38'],
  ['eilean-siar', 'Na h-Eileanan Siar', 'GB-SCT', 'scotland', 'Stornoway 58.21 -6.39; Tarbert 57.90 -6.81; Balivanich 57.47 -7.38; Lochboisdale 57.15 -7.31; Castlebay 56.95 -7.49; Lochmaddy 57.60 -7.16', 'the Outer Hebrides'],
  ['north-ayrshire', 'North Ayrshire', 'GB-SCT', 'scotland', 'Irvine 55.61 -4.67; Ardrossan 55.64 -4.81; Largs 55.79 -4.87; Brodick 55.58 -5.15; Saltcoats 55.63 -4.79; Kilwinning 55.65 -4.70'],
  ['north-lanarkshire', 'North Lanarkshire', 'GB-SCT', 'scotland', 'Motherwell 55.79 -3.99; Cumbernauld 55.95 -3.99; Airdrie 55.87 -3.98; Coatbridge 55.86 -4.03; Wishaw 55.77 -3.92'],
  ['orkney', 'Orkney Islands', 'GB-SCT', 'scotland', 'Kirkwall 58.98 -2.96; Stromness 58.96 -3.30; St Margaret\'s Hope 58.83 -2.96; Pierowall 59.32 -2.98', 'Orkney'],
  ['perth-and-kinross', 'Perth and Kinross', 'GB-SCT', 'scotland', 'Perth 56.40 -3.43; Pitlochry 56.70 -3.73; Crieff 56.37 -3.84; Aberfeldy 56.62 -3.87; Blairgowrie 56.59 -3.34; Dunkeld 56.57 -3.59; Kinross 56.21 -3.42; Auchterarder 56.30 -3.70; Kinloch Rannoch 56.70 -4.18'],
  ['renfrewshire', 'Renfrewshire', 'GB-SCT', 'scotland', 'Paisley 55.85 -4.42; Renfrew 55.87 -4.39; Johnstone 55.83 -4.51; Erskine 55.90 -4.45'],
  ['scottish-borders', 'Scottish Borders', 'GB-SCT', 'scotland', 'Galashiels 55.62 -2.81; Hawick 55.42 -2.79; Peebles 55.65 -3.19; Kelso 55.60 -2.43; Melrose 55.60 -2.72; Jedburgh 55.48 -2.55; Selkirk 55.55 -2.84; Duns 55.78 -2.34; Eyemouth 55.87 -2.09; Coldstream 55.65 -2.25; Innerleithen 55.62 -3.06; Newcastleton 55.18 -2.81', 'the Scottish Borders'],
  ['shetland', 'Shetland Islands', 'GB-SCT', 'scotland', 'Lerwick 60.15 -1.15; Scalloway 60.14 -1.27; Brae 60.40 -1.35; Baltasound 60.76 -0.86; Sumburgh 59.87 -1.29', 'Shetland'],
  ['south-ayrshire', 'South Ayrshire', 'GB-SCT', 'scotland', 'Ayr 55.46 -4.63; Troon 55.54 -4.66; Prestwick 55.50 -4.61; Girvan 55.24 -4.86; Maybole 55.35 -4.68; Ballantrae 55.10 -5.00'],
  ['south-lanarkshire', 'South Lanarkshire', 'GB-SCT', 'scotland', 'Hamilton 55.78 -4.04; East Kilbride 55.76 -4.18; Lanark 55.67 -3.78; Biggar 55.62 -3.53; Carluke 55.73 -3.84; Abington 55.49 -3.70; Strathaven 55.68 -4.07; Leadhills 55.42 -3.76; Rutherglen 55.83 -4.21'],
  ['stirling', 'Stirling', 'GB-SCT', 'scotland', 'Stirling 56.12 -3.94; Callander 56.24 -4.21; Killin 56.47 -4.32; Dunblane 56.19 -3.96; Aberfoyle 56.18 -4.38; Crianlarich 56.39 -4.62; Drymen 56.07 -4.45'],
  ['west-dunbartonshire', 'West Dunbartonshire', 'GB-SCT', 'scotland', 'Dumbarton 55.94 -4.57; Clydebank 55.90 -4.40; Alexandria 55.99 -4.58'],
  ['west-lothian', 'West Lothian', 'GB-SCT', 'scotland', 'Livingston 55.90 -3.52; Linlithgow 55.98 -3.60; Bathgate 55.90 -3.64; Broxburn 55.93 -3.47; Whitburn 55.86 -3.69'],
  /* ---------- Northern Ireland: the 6 counties ---------- */
  ['antrim', 'County Antrim', 'GB-NIR', 'northern-ireland', 'Belfast 54.60 -5.93; Ballymena 54.86 -6.28; Antrim 54.72 -6.21; Larne 54.85 -5.82; Carrickfergus 54.72 -5.81; Ballycastle 55.20 -6.24; Ballymoney 55.07 -6.51; Portrush 55.20 -6.65; Lisburn 54.51 -6.04; Bushmills 55.20 -6.52; Cushendall 55.08 -6.06; Newtownabbey 54.66 -5.90'],
  ['armagh', 'County Armagh', 'GB-NIR', 'northern-ireland', 'Armagh 54.35 -6.65; Portadown 54.42 -6.44; Lurgan 54.46 -6.33; Crossmaglen 54.08 -6.61; Keady 54.25 -6.70; Tandragee 54.35 -6.41'],
  ['down', 'County Down', 'GB-NIR', 'northern-ireland', 'Newry 54.18 -6.34; Bangor 54.66 -5.67; Downpatrick 54.33 -5.71; Newcastle 54.21 -5.89; Newtownards 54.59 -5.69; Banbridge 54.35 -6.27; Holywood 54.64 -5.84; Kilkeel 54.06 -6.00; Ballynahinch 54.40 -5.90; Portaferry 54.38 -5.55; Dromore 54.42 -6.15; Warrenpoint 54.10 -6.25'],
  ['fermanagh', 'County Fermanagh', 'GB-NIR', 'northern-ireland', 'Enniskillen 54.34 -7.64; Lisnaskea 54.25 -7.44; Irvinestown 54.47 -7.63; Belleek 54.48 -8.09; Kesh 54.53 -7.72; Belcoo 54.30 -7.87'],
  ['londonderry', 'County Londonderry', 'GB-NIR', 'northern-ireland', 'Derry/Londonderry 55.00 -7.32; Coleraine 55.13 -6.67; Limavady 55.05 -6.95; Magherafelt 54.76 -6.61; Portstewart 55.18 -6.72; Dungiven 54.93 -6.92; Maghera 54.84 -6.67'],
  ['tyrone', 'County Tyrone', 'GB-NIR', 'northern-ireland', 'Omagh 54.60 -7.30; Dungannon 54.50 -6.77; Cookstown 54.64 -6.74; Strabane 54.83 -7.46; Coalisland 54.54 -6.70; Fivemiletown 54.38 -7.31; Castlederg 54.71 -7.59; Clogher 54.41 -7.17'],
];
const UK_COUNTIES = {};
const _UK_TOWNS = [];
for (const [id, name, nation, region, towns, welcome] of _UK_ROWS) {
  UK_COUNTIES[id] = Object.freeze({ id, name, welcome: welcome || name, nation, region });
  for (const t of towns.split(';')) {
    const m = /^\s*(.+?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/.exec(t);
    if (m) _UK_TOWNS.push({ town: m[1], lat: +m[2], lon: +m[3], id });
  }
}
function ukCounty(id) { return Object.prototype.hasOwnProperty.call(UK_COUNTIES, id) ? UK_COUNTIES[id] : null; }
function ukCountiesIn(region) { return Object.values(UK_COUNTIES).filter(c => c.region === region); }
function ukTowns() { return _UK_TOWNS.slice(); }
/** The area of the nearest main town (within maxKm, default 40; the UK's box only), or null. */
function ukCountyNearest(lat, lon, maxKm) {
  lat = Number(lat); lon = Number(lon);
  if (!isFinite(lat) || !isFinite(lon) || lat < 49.8 || lat > 61 || lon < -8.7 || lon > 2) return null;
  const r = Math.PI / 180, lim = isFinite(maxKm) ? maxKm : 40;
  let best = null, bestKm = Infinity;
  for (const t of _UK_TOWNS) {
    const dLat = (t.lat - lat) * r, dLon = (t.lon - lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(t.lat * r) * Math.sin(dLon / 2) ** 2;
    const km = 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
    if (km < bestKm) { bestKm = km; best = t; }
  }
  if (!best || bestKm > lim) return null;
  return Object.assign({}, UK_COUNTIES[best.id], { town: best.town, km: Math.round(bestKm * 10) / 10 });
}
