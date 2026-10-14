import type { StationId } from "./camp";

/** All coordinates are pixels in the approved 1536 x 1024 painting, never screen pixels. */
export const CAMP_ART_WIDTH = 1536;
export const CAMP_ART_HEIGHT = 1024;
export const CAMP_ART_URL = "maps/camp.webp";
export type CampPoint = readonly [number, number];
export type CampOccluder = {
  id: string;
  station?: StationId;
  /** The bottom of the object's physical base, used in the same depth sort as delver feet. */
  baseline: number;
  polygon: readonly CampPoint[];
  /** Includes a hollow gate opening for taps, without painting that opening over the delver. */
  hitPolygon?: readonly CampPoint[];
};

/** Silhouettes traced from camp-v1-grid.png. Do not replace them with rectangular building cutouts. */
export const CAMP_OCCLUDERS: readonly CampOccluder[] = [
  // Floor and steps belong to the ground. Only upright silhouettes can cover a delver.
  { id: "hall", station: "hall", baseline: 298,
    polygon: [[253,171],[253,146],[270,130],[309,109],[331,92],[381,114],[408,157],[408,294],[368,295],[368,284],[295,284],[295,295],[254,295]],
    hitPolygon: [[169,164],[250,164],[252,146],[270,130],[309,109],[331,92],[381,114],[408,157],[494,162],[503,315],[478,335],[407,334],[407,355],[255,355],[254,334],[174,331]] },
  { id: "hall-left", station: "hall", baseline: 354, polygon: [[169,164],[250,164],[254,173],[254,301],[283,301],[283,351],[254,354],[254,334],[174,331]] },
  { id: "hall-right", station: "hall", baseline: 356, polygon: [[409,157],[494,162],[503,315],[478,335],[408,334],[408,355],[383,355],[383,301],[409,301]] },
  { id: "gate", station: "gate", baseline: 304,
    polygon: [[658,39],[693,27],[747,3],[791,8],[842,34],[866,53],[867,109],[833,163],[832,134],[814,112],[769,93],[731,113],[706,148],[688,99]],
    hitPolygon: [[623,60],[658,39],[693,27],[747,3],[791,8],[842,34],[898,47],[916,284],[867,294],[825,284],[709,284],[655,304],[612,289]] },
  { id: "gate-left", station: "gate", baseline: 304, polygon: [[623,60],[658,39],[687,57],[699,105],[708,148],[708,224],[710,284],[684,300],[654,304],[612,289]] },
  { id: "gate-right", station: "gate", baseline: 304, polygon: [[841,46],[898,47],[916,284],[867,294],[830,285],[829,217],[831,158],[844,116]] },
  { id: "armory", station: "armory", baseline: 334, polygon: [[1028,157],[1068,140],[1107,169],[1240,170],[1243,142],[1282,143],[1283,289],[1310,315],[1304,334],[1277,340],[1262,336],[1232,336],[1219,328],[1185,327],[1157,336],[1138,328],[1081,329],[1056,340],[1024,332]] },
  { id: "armory-rack", station: "armory", baseline: 340, polygon: [[1052,307],[1073,292],[1097,305],[1094,329],[1080,340],[1058,339]] },
  { id: "armory-crates", station: "armory", baseline: 350, polygon: [[1232,314],[1257,307],[1275,316],[1270,343],[1257,350],[1232,344]] },
  { id: "anvil", station: "armory", baseline: 370, polygon: [[1103,327],[1138,316],[1176,326],[1173,344],[1160,350],[1166,359],[1165,368],[1121,366],[1120,349],[1104,342]] },
  { id: "vault", station: "ledger", baseline: 542, polygon: [[1229,470],[1260,419],[1287,397],[1342,374],[1383,388],[1408,415],[1446,449],[1471,483],[1471,529],[1451,541],[1418,542],[1418,527],[1265,527],[1265,542],[1230,545]] },
  { id: "vault-pillar", baseline: 568, polygon: [[1185,413],[1210,409],[1226,416],[1224,435],[1217,444],[1213,545],[1219,556],[1214,569],[1188,570],[1182,557],[1192,545],[1190,446],[1183,438]] },
  { id: "vault-side-crate", baseline: 562, polygon: [[1146,512],[1168,508],[1185,520],[1186,547],[1175,562],[1148,555],[1144,532]] },
  { id: "vault-side-rock", baseline: 495, polygon: [[1129,457],[1150,443],[1170,444],[1183,456],[1186,482],[1172,495],[1145,494],[1123,483]] },
  { id: "altar", station: "altar", baseline: 632, polygon: [[88,438],[132,424],[132,559],[165,552],[192,463],[216,436],[241,468],[264,547],[296,545],[294,439],[335,429],[341,534],[390,531],[395,583],[375,594],[353,610],[331,610],[312,628],[129,630],[106,608],[78,605],[74,566],[58,554],[59,533],[88,530]] },
  { id: "draw-board", station: "board", baseline: 761, polygon: [[1087,576],[1138,590],[1184,594],[1244,597],[1280,609],[1339,610],[1361,600],[1377,615],[1391,720],[1365,748],[1309,750],[1260,756],[1243,758],[1223,738],[1115,735],[1097,715]] },
  { id: "guide", station: "guide", baseline: 857, polygon: [[879,745],[962,732],[979,748],[979,823],[950,828],[955,850],[950,859],[942,858],[942,806],[881,807]] },
  { id: "tent", baseline: 638, polygon: [[449,523],[466,504],[519,486],[531,470],[543,493],[583,505],[601,502],[600,599],[581,617],[517,637],[465,627],[442,621]] },
  { id: "fire-ring", baseline: 590, polygon: [[717,544],[737,525],[750,523],[755,506],[768,479],[779,505],[796,524],[817,535],[832,554],[831,570],[811,586],[746,592],[715,576]] },
  { id: "west-bench", baseline: 550, polygon: [[680,534],[719,502],[737,515],[732,530],[726,535],[710,551],[697,548],[690,551]] },
  { id: "east-bench", baseline: 545, polygon: [[820,498],[838,504],[870,524],[864,538],[851,548],[835,536],[833,532]] },
  { id: "south-bench", baseline: 601, polygon: [[699,565],[725,572],[737,585],[728,600],[714,597],[701,585]] },
  { id: "north-west-bench", baseline: 462, polygon: [[661,429],[696,413],[724,430],[721,444],[705,448],[677,457],[671,467]] },
  { id: "north-east-bench", baseline: 465, polygon: [[849,423],[869,425],[898,444],[897,457],[882,462],[852,449]] },
  { id: "hall-lamp", baseline: 389, polygon: [[510,291],[542,289],[557,297],[556,322],[540,318],[537,357],[521,360],[516,343],[523,321],[542,302],[546,375],[536,389],[550,391],[564,383],[560,352],[558,302]] },
  { id: "armory-lamp", station: "armory", baseline: 363, polygon: [[977,211],[1004,208],[1025,217],[999,230],[998,270],[1004,281],[1003,300],[990,309],[983,285],[992,271],[995,219],[977,222],[977,344],[987,359],[974,363],[968,353],[970,224]] },
  { id: "hall-storage", baseline: 376, polygon: [[449,327],[463,318],[489,333],[505,345],[503,363],[487,376],[449,375],[435,360],[434,346]] },
  { id: "west-lamp", baseline: 478, polygon: [[616,395],[650,379],[657,385],[649,399],[647,468],[658,476],[639,481],[634,468],[638,401],[629,405],[629,426],[635,434],[634,450],[623,455],[615,441],[620,426],[622,407],[615,405]] },
  { id: "east-lamp", baseline: 477, polygon: [[906,383],[918,380],[943,396],[943,405],[935,406],[935,429],[944,437],[943,453],[932,459],[924,444],[930,430],[929,405],[920,401],[920,467],[928,475],[910,479],[906,469]] },
  { id: "west-banner", baseline: 668, polygon: [[610,549],[624,550],[653,563],[660,567],[656,625],[643,635],[625,620],[624,657],[631,665],[611,670],[610,661]] },
  { id: "east-banner", baseline: 675, polygon: [[906,548],[919,545],[932,550],[939,562],[933,617],[921,638],[920,663],[928,672],[907,679],[902,668]] },
  { id: "west-brazier", baseline: 701, polygon: [[673,629],[684,615],[697,629],[702,645],[697,663],[699,696],[689,706],[674,700],[672,669],[668,654]] },
  { id: "east-brazier", baseline: 702, polygon: [[848,636],[863,614],[874,639],[878,654],[873,672],[876,696],[863,707],[848,700],[845,671],[843,655]] },
  { id: "tunnel-left", baseline: 958, polygon: [[682,806],[677,799],[682,774],[701,770],[713,783],[719,837],[716,937],[705,958],[687,953]] },
  { id: "tunnel-right", baseline: 960, polygon: [[815,783],[835,774],[856,790],[863,807],[853,936],[837,959],[812,949],[809,832]] },
  { id: "tunnel-lintel", baseline: 960, polygon: [[716,810],[812,810],[815,832],[797,850],[720,845]] },
  { id: "west-crates", baseline: 701, polygon: [[634,660],[651,650],[668,661],[669,690],[654,703],[632,695]] },
  { id: "east-crates", baseline: 633, polygon: [[943,600],[960,590],[967,569],[986,560],[1007,573],[1002,597],[993,599],[990,620],[974,634],[954,636],[940,622]] },
  { id: "west-tunnel-rock", baseline: 998, polygon: [[546,749],[583,748],[629,787],[660,836],[675,909],[681,963],[699,998],[605,989],[562,938],[529,873],[512,817]] },
  { id: "east-tunnel-rock", baseline: 1007, polygon: [[871,917],[914,854],[960,842],[980,866],[971,928],[946,977],[937,1007],[838,1007]] },
];

export const CAMP_LABELS: Record<StationId, CampPoint> = {
  gate: [768, 74], hall: [331, 117], altar: [216, 421], armory: [1165, 164],
  ledger: [1353, 406], board: [1227, 587], guide: [920, 737],
};

export type CampLight = { x: number; y: number; rgb: string; radius: number; kind: "fire" | "torch" | "lantern" | "crystal" | "gate" | "water" | "tunnel" };
const warm = "255,170,70";
export const CAMP_LIGHTS: readonly CampLight[] = [
  {x:773,y:546,rgb:"255,143,50",radius:155,kind:"fire"},
  ...[[654,167],[884,173],[847,396],[688,646],[864,644],[700,792],[845,795],[1186,305]].map(([x,y]) => ({x,y,rgb:warm,radius:61,kind:"torch" as const})),
  ...[[269,297],[395,300],[109,550],[321,550],[136,588],[303,590]].map(([x,y]) => ({x,y,rgb:"244,100,255",radius:52,kind:"torch" as const})),
  ...[[528,341],[626,433],[933,439],[993,282],[1253,261],[1261,482],[1447,486],[1097,650],[1281,650]].map(([x,y]) => ({x,y,rgb:"255,197,97",radius:57,kind:"lantern" as const})),
  ...[[137,148],[516,88],[77,347],[590,254],[1102,75],[1399,231],[1470,332],[484,878],[1416,923]].map(([x,y]) => ({x,y,rgb:"73,207,255",radius:61,kind:"crystal" as const})),
  {x:216,y:488,rgb:"244,87,255",radius:96,kind:"crystal"},
  {x:920,y:797,rgb:"78,223,255",radius:46,kind:"crystal"},
  {x:769,y:182,rgb:"57,241,147",radius:116,kind:"gate"},
  {x:182,y:850,rgb:"64,195,255",radius:95,kind:"water"},
  {x:1415,y:232,rgb:"64,195,255",radius:72,kind:"water"},
  {x:772,y:906,rgb:"110,225,255",radius:101,kind:"tunnel"},
];

export const CAMP_WATER: readonly { polygon: readonly CampPoint[]; falls: readonly [number,number,number,number][] }[] = [
  {polygon:[[97,796],[162,786],[176,811],[273,803],[321,840],[414,875],[427,911],[391,937],[269,943],[140,939],[65,883],[67,840]],falls:[[116,717,27,113],[151,725,12,93]]},
  {polygon:[[1350,213],[1385,201],[1438,212],[1509,241],[1534,258],[1504,291],[1450,284],[1389,253]],falls:[[1420,122,27,105],[1380,107,16,109]]},
  {polygon:[[1240,911],[1297,899],[1352,903],[1375,920],[1312,940],[1259,946]],falls:[]},
];

/** Point-in-polygon for painted building taps. Rock surrounding the silhouette is not a building hit. */
export function inCampPolygon(x: number, y: number, polygon: readonly CampPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function paintedStationAt(x: number, y: number): StationId | null {
  // Highest baseline first, matching the visible object where silhouettes overlap.
  const hits = CAMP_OCCLUDERS.filter(o => o.station && inCampPolygon(x,y,o.hitPolygon ?? o.polygon));
  hits.sort((a,b) => b.baseline-a.baseline);
  return hits[0]?.station ?? null;
}
