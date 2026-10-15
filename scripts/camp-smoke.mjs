// Painted-camp QA in isolated browser contexts. Never connects a wallet, buys, mints or edits an existing save.
// SMOKE_CHANNEL=msedge node scripts/camp-smoke.mjs [baseUrl] [outDir]
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:5741/";
const out = process.argv[3] ?? "artifacts/camp";
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({channel:process.env.SMOKE_CHANNEL || "msedge"});
const errors = [], results = {};

async function session(width,height,name,paint=true) {
  const context = await browser.newContext({viewport:{width,height}});
  const page = await context.newPage();
  page.on("pageerror",e=>errors.push(`${name}: ${e.message}`));
  page.on("console",m=>{if(m.type()==="error" && !(paint===false && m.text().includes("ERR_FAILED"))) errors.push(`${name}: ${m.text()}`);});
  if (!paint) await page.route("**/maps/camp-ground.webp",route=>route.abort());
  await page.goto(base);
  await page.getByRole("button",{name:"Open Dungeon Gate"}).waitFor();
  if (await page.getByRole("button",{name:/got it/i}).count()) await page.getByRole("button",{name:/got it/i}).click();
  if (paint) await page.waitForFunction(async()=>(await import("/src/render/camp-renderer.ts")).paintedCampReady());
  await page.evaluate(()=>document.fonts.ready);
  return {page,context};
}

async function position(page) {
  return page.locator("canvas[data-scene=camp]").evaluate(c=>({x:Number(c.dataset.playerX),y:Number(c.dataset.playerY)}));
}

async function walk(page,to) {
  const from = await position(page);
  const path = await page.evaluate(async({from,to})=>(await import("/src/game/camp.ts")).pathTo(from,to),{from,to});
  assert.notEqual(path,null,`unreachable walk to ${to.x},${to.y}`);
  let at=from;
  for (const next of path) {
    const key = next.x>at.x?"ArrowRight":next.x<at.x?"ArrowLeft":next.y>at.y?"ArrowDown":"ArrowUp";
    await page.keyboard.press(key);
    // React may commit after Playwright's keyup, especially at the phone viewport under build/test load.
    await page.waitForFunction(({x,y})=>{
      const c=document.querySelector("canvas[data-scene=camp]");
      return Number(c.dataset.playerX)===x&&Number(c.dataset.playerY)===y;
    },next,{timeout:3000});
    assert.deepEqual(await position(page),next);
    await page.waitForTimeout(145);
    at=next;
  }
  return path.length;
}

async function tapWorld(page,x,y) {
  const screen = await page.locator("canvas[data-scene=camp]").evaluate(async(c,{x,y})=>{
    const {campCamera}=await import("/src/render/camp-renderer.ts");
    const z=Number(c.dataset.zoom),r=c.getBoundingClientRect();
    const camera=campCamera({x:Number(c.dataset.playerX),y:Number(c.dataset.playerY)},{w:c.width/z,h:c.height/z});
    return {x:r.left+(x-camera.x)*z,y:r.top+(y-camera.y)*z};
  },{x,y});
  assert(screen.x>=0 && screen.x<page.viewportSize().width && screen.y>=0 && screen.y<page.viewportSize().height,"tap outside viewport");
  await page.mouse.click(screen.x,screen.y);
}

async function closePanel(page) {
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({state:"hidden"});
}

try {
  for (const [width,height,name] of (process.env.CAMP_QA_RENDER_ONLY ? [] : [[1280,800,"desktop"],[375,812,"phone"]])) {
    const {page,context}=await session(width,height,name);
    await page.screenshot({path:`${out}/${name}-entry.png`});
    assert.deepEqual(await position(page),{x:24,y:24});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    // A clear bit of paving: the pointer uses the same camera/zoom as the renderer.
    await tapWorld(page,24*32+16,22*32+16);
    await page.waitForFunction(()=>{const c=document.querySelector("canvas[data-scene=camp]");return c.dataset.playerY==="22";});
    await walk(page,{x:24,y:20});
    await page.screenshot({path:`${out}/${name}-fire.png`});
    const stations=await page.evaluate(async()=>(await import("/src/game/camp.ts")).STATIONS);
    // The middle of each building's picture, in ground pixels.
    const stationHits=await page.evaluate(async()=>{
      const {CAMP_OBJECTS,objectBox}=await import("/src/game/camp-art.ts");
      return Object.fromEntries(CAMP_OBJECTS.filter(o=>o.station).map(o=>{const b=objectBox(o);return [o.station,[b.x+b.w/2,b.y+b.h/2]];}));
    });
    const opened=[];
    for (const id of ["guide","gate","hall","altar","armory","ledger","board"]) {
      const s=stations.find(s=>s.id===id);
      await page.getByRole("button",{name:`Open ${s.name}`,exact:true}).first().click();
      const dialog=page.getByRole("dialog");
      await dialog.getByRole("heading",{name:s.name,exact:true}).waitFor();
      await dialog.getByText("Opening…",{exact:true}).waitFor({state:"hidden"});
      await page.screenshot({path:`${out}/${name}-${id}-panel.png`});
      await closePanel(page);
      assert(Math.abs((await position(page)).x-s.x)+Math.abs((await position(page)).y-s.y)<=1);
      // Keyboard and a tap on the full painted building both reach the same panel.
      await page.keyboard.press("e");
      await dialog.getByRole("heading",{name:s.name,exact:true}).waitFor();
      await closePanel(page);
      await tapWorld(page,...stationHits[id]);
      await dialog.getByRole("heading",{name:s.name,exact:true}).waitFor();
      await closePanel(page);
      opened.push(id);
    }
    // The two braziers overlap reachable paving; the player no longer walks onto moss behind the lamps/banners.
    for (const [id,x,y] of [["brazier-w",22,19],["brazier-e",25,19]]) {
      await walk(page,{x,y});
      await page.screenshot({path:`${out}/${name}-behind-${id}.png`});
    }
    // A step away from or onto every door: a BFS-only check cannot catch phantom walls.
    const floorSteps = [[24,7,0,1],[11,11,0,1],[9,15,1,0],[37,11,0,1],[38,15,1,0],[37,19,0,-1],[24,23,1,0],
      [11,13,0,1],[23,7,0,1],[36,11,0,1],
      [20,14,1,0],[27,15,1,0],[22,12,0,1],[26,16,0,1],
      [21,16,0,1],[27,14,0,-1]]; // Clear approaches and the two removed corner benches.
    for (const [x,y,dx,dy] of floorSteps) {
      await walk(page,{x,y});
      await page.keyboard.press(dx===1?"ArrowRight":dy===-1?"ArrowUp":"ArrowDown");
      assert.deepEqual(await position(page),{x:x+dx,y:y+dy},`clear-floor step ${x},${y}`);
      await page.waitForTimeout(145);
    }
    const blockedSteps=[[24,7,1,0],[37,11,1,0],[39,15,0,1],[20,18,-1,0],[28,18,1,0],[21,19,0,1]];
    for(const [x,y,dx,dy] of blockedSteps) {
      await walk(page,{x,y});
      const key=dx===1?"ArrowRight":dx===-1?"ArrowLeft":"ArrowDown";
      for(let i=0;i<3;i++){await page.keyboard.press(key);await page.waitForTimeout(145);}
      assert.deepEqual(await position(page),{x,y},`walked through curb at ${x},${y}`);
      await tapWorld(page,(x+dx)*32+16,(y+dy)*32+16);
      await page.waitForTimeout(300);
      assert.deepEqual(await position(page),{x,y},`tap crossed curb at ${x},${y}`);
    }
    await page.screenshot({path:`${out}/${name}-curb-stop.png`});
    await walk(page,{x:36,y:11});
    await tapWorld(page,34*32+16,11*32+30);
    await page.waitForTimeout(350);
    assert.deepEqual(await position(page),{x:36,y:11},"tap on forge-side moss must not cross the curb");
    assert.equal(await page.getByRole("dialog").count(),0,"empty forge floor must not open Armory");
    await page.screenshot({path:`${out}/${name}-anvil-floor.png`});
    if (name==="phone") {
      await walk(page,{x:24,y:24});
      await page.getByRole("button",{name:"Move up",exact:true}).click();
      assert.deepEqual(await position(page),{x:24,y:23});
    }
    results[name]={viewport:[width,height],opened,keyboardWalks:true,groundTap:true,buildingTaps:true,clearFloorSteps:floorSteps.length,
      blockedCurbWalks:blockedSteps.length,blockedCurbTaps:blockedSteps.length,forgeFloorTapBlocked:true};
    await context.close();
    console.log(`${name}: all seven panels, E, painted taps, walking and depth views passed`);
  }

  const {page,context}=await session(1280,800,"render-fixtures");
  // Pixel tests use the production renderer, with no crowd and fixed lighting/labels.
  results.render=await page.evaluate(async()=>{
    const {drawCamp,campFurnitureViews,campCurbLayer}=await import("/src/render/camp-renderer.ts");
    const {CAMP_CURBS,CAMP_CURB_VERTICES,CAMP_SHEETS,CAMP_FIRE_STYLE,CAMP_PAVING}=await import("/src/game/camp-art.ts");
    const f={time:0,reducedMotion:true,camera:{x:0,y:0},view:{w:1536,h:1024},zoom:1,
      hero:{animal:"cat-ginger-tabby",dir:"down",frame:"a",offX:0,offY:0,flash:0},
      playerPos:{x:24,y:20},playerName:"",playerColor:"#fff",near:null,firstVisit:false,crowd:[]};
    const canvas=document.createElement("canvas");canvas.width=1536;canvas.height=1024;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    const pixels=(frame)=>{drawCamp(ctx,frame);return ctx.getImageData(0,0,1536,1024).data;};
    const a=pixels(f),b=pixels({...f,time:1800});
    const still=a.every((v,i)=>v===b[i]);
    const motion0=pixels({...f,reducedMotion:false}),motion1=pixels({...f,reducedMotion:false,time:1800});
    let changed=0;for(let i=0;i<motion0.length;i+=4)if(motion0[i]!==motion1[i]||motion0[i+1]!==motion1[i+1]||motion0[i+2]!==motion1[i+2])changed++;
    // Inspect the production cache builder directly; never mutate imported objects (HMR can duplicate module URLs).
    const sheets=Object.fromEntries(await Promise.all(Object.keys(CAMP_SHEETS).map(async name=>{
      const image=new Image();image.src=`/lobby/${name}.png`;await image.decode();
      const c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;
      c.getContext("2d").drawImage(image,0,0);return [name,c];
    })));
    const views=campFurnitureViews(sheets);
    const curbPixels=campCurbLayer(sheets.curbs).getContext("2d").getImageData(0,0,1536,1024).data;
    const filledCurbGaps=[["gate-side",804,240],["armory-side",1220,368],["vault-side",1264,516]].map(([id,x,y])=>
      ({id,x,y,visible:curbPixels[(y*1536+x)*4+3]>0}));
    let curbPixelsOnPaving=0;
    for(const p of CAMP_PAVING)for(let y=p.y*32;y<(p.y+p.h)*32;y++)for(let x=p.x*32;x<(p.x+p.w)*32;x++) {
      if(curbPixels[(y*1536+x)*4+3])curbPixelsOnPaving++;
    }
    // Scan between opaque stone on both sides, rather than just trusting the rectangle metadata.
    const corridorWidths=[
      ["north",768,304,"x"],["south",768,688,"x"],
      ["hall",352,400,"x"],["armory",1184,400,"x"],["board",1184,592,"x"],
      ["west",496,480,"y"],["east",1072,480,"y"],
    ].map(([id,x,y,axis])=>{
      const alpha=n=>curbPixels[((axis==="y"?n:y)*1536+(axis==="x"?n:x))*4+3];
      let low=axis==="x"?x:y,high=low;
      while(low>0&&!alpha(low-1))low--;
      while(high<(axis==="x"?1536:1024)&&!alpha(high))high++;
      return {id,clearPixels:high-low};
    });
    // The replacement art has a real horizontal seat and a real vertical seat; no runtime shearing or rotation.
    const benchLevels=CAMP_SHEETS.benches.map((id,col)=>{
      const data=sheets.benches.getContext("2d").getImageData(col*224,0,224,208).data;
      const vertical=id==="bench-v",edge=[];
      for(let p=0;p<(vertical?208:224);p++)for(let q=0;q<(vertical?224:208);q++) {
        const x=vertical?q:p,y=vertical?p:q;
        if(data[(y*224+x)*4+3]){edge.push([p,q]);break;}
      }
      const min=edge[0][0],span=edge.at(-1)[0]-min;
      const middle=edge.filter(([p])=>p>min+span*.15&&p<min+span*.7),coords=middle.map(p=>p[1]);
      return {id,samples:middle.length,edgeVariation:Math.max(...coords)-Math.min(...coords)};
    });
    const fire=views.fire.getContext("2d").getImageData(0,0,224,208).data;
    const squareFireCorners=[[78,131],[145,131],[78,198],[145,198]].map(([x,y])=>fire[(y*224+x)*4+3]>0);
    // Where braziers overlap playable paving the delver must remain visible.
    const depth=[];
    for(const [id,x,y] of [["brazier-w",22,19],["brazier-e",25,19]]) {
      const frame={...f,playerPos:{x,y}};
      const visible=pixels(frame),absent=pixels({...frame,hero:{...f.hero,offX:10000}});
      let shown=0;
      for(let py=y*32-30;py<y*32+32;py++)for(let px=x*32-25;px<x*32+58;px++) {
        const p=(py*1536+px)*4;
        if(visible[p]!==absent[p]||visible[p+1]!==absent[p+1]||visible[p+2]!==absent[p+2])shown++;
      }
      depth.push({id,shown});
    }
    const clearFloor=[];
    for(const [id,x,y] of [["gate-door",24,7],["hall-door",11,11],["altar-door",9,15],["armory-door",37,11],
      ["vault-door",39,15],["board-door",37,19],["guide-door",25,23],["fire-south",24,18],["plaza-south-curb",21,19]]) {
      const frame={...f,playerPos:{x,y}};
      const visible=pixels(frame),absent=pixels({...frame,hero:{...f.hero,offX:10000}});
      let shown=0;
      for(let py=y*32-30;py<y*32+32;py++)for(let px=x*32-25;px<x*32+58;px++) {
        const p=(py*1536+px)*4;
        if(visible[p]!==absent[p]||visible[p+1]!==absent[p+1]||visible[p+2]!==absent[p+2])shown++;
      }
      clearFloor.push({id,shown});
    }
    // Profile one typical desktop view, without pixel readback in the timed loop.
    const view={...f,camera:{x:464,y:430},view:{w:640,h:400},zoom:2,reducedMotion:false};
    const times=[];
    for(let i=0;i<40;i++){const t=performance.now();drawCamp(ctx,{...view,time:i*34});if(i>4)times.push(performance.now()-t);}
    times.sort((a,b)=>a-b);
    drawCamp(ctx,{...f,view:{w:0,h:0}}); // Hidden/removed canvases must not throw.
    const finalPixels=pixels({...f,playerPos:{x:24,y:24}});
    const squarePlazaCorners=[[656,368],[912,368],[656,624],[912,624]].map(([x,y])=>{
      const i=(y*1536+x)*4; return {x,y,rgb:[finalPixels[i],finalPixels[i+1],finalPixels[i+2]]};
    });
    return {reducedMotionStill:still,animatedPixels:changed,depth,clearFloor,curbSegments:CAMP_CURBS.length,
      curbCorners:CAMP_CURB_VERTICES.filter(v=>v.bend).length,squarePlazaCorners,benchLevels,filledCurbGaps,curbPixelsOnPaving,corridorWidths,fireStyle:CAMP_FIRE_STYLE,squareFireCorners,
      wholeLobbyPng:canvas.toDataURL("image/png").split(",")[1],
      frameMsMedian:times[Math.floor(times.length/2)],frameMsP95:times[Math.floor(times.length*.95)]};
  });
  writeFileSync(`${out}/whole-lobby.png`,Buffer.from(results.render.wholeLobbyPng,"base64"));
  delete results.render.wholeLobbyPng;
  assert.equal(results.render.reducedMotionStill,true);
  assert(results.render.animatedPixels>100);
  for(const d of results.render.depth)assert(d.shown>150,`${d.id}: delver hidden behind it (${d.shown} visible pixels)`);
  for(const d of results.render.clearFloor)assert(d.shown>400,`${d.id}: delver hidden by painted floor (${d.shown} visible pixels)`);
  for(const p of results.render.squarePlazaCorners)assert(Math.min(...p.rgb)>40&&Math.max(...p.rgb)-Math.min(...p.rgb)<60,`square plaza corner ${p.x},${p.y} is not paving`);
  for(const b of results.render.benchLevels)assert(b.samples>10&&b.edgeVariation<=2,`${b.id}: seat edge is not axis-aligned (${b.edgeVariation}px)`);
  for(const gap of results.render.filledCurbGaps)assert(gap.visible,`${gap.id}: owner-marked curb gap is still empty`);
  assert.equal(results.render.curbPixelsOnPaving,0,"curb overlaps a walking tile");
  for(const path of results.render.corridorWidths)assert.equal(path.clearPixels,64,`${path.id}: paving must have exactly two clear tiles`);
  if(results.render.fireStyle==="square")assert(results.render.squareFireCorners.every(Boolean),"square hearth has a missing corner");
  await context.close();

  const fallback=await session(1280,800,"fallback",false);
  assert.equal(await fallback.page.evaluate(async()=>(await import("/src/render/camp-renderer.ts")).paintedCampReady()),false);
  await fallback.page.screenshot({path:`${out}/fallback.png`});
  await fallback.page.getByRole("button",{name:"Open Dungeon Gate"}).click();
  await fallback.page.getByRole("dialog").getByRole("heading",{name:"Dungeon Gate",exact:true}).waitFor();
  results.fallback={imageUnavailable:true,gateOpens:true};
  await fallback.context.close();
  assert.deepEqual(errors,[],"browser errors");
  writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2)+"\n");
  console.log(JSON.stringify(results,null,2));
} finally {
  await browser.close();
}
