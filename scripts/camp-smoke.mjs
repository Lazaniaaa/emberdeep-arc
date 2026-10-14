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
const stationHits = {gate:[770,160],hall:[331,220],altar:[215,580],armory:[1185,285],ledger:[1360,488],board:[1190,665],guide:[915,785]};

async function session(width,height,name,paint=true) {
  const context = await browser.newContext({viewport:{width,height}});
  const page = await context.newPage();
  page.on("pageerror",e=>errors.push(`${name}: ${e.message}`));
  page.on("console",m=>{if(m.type()==="error" && !(paint===false && m.text().includes("ERR_FAILED"))) errors.push(`${name}: ${m.text()}`);});
  if (!paint) await page.route("**/maps/camp.webp",route=>route.abort());
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
    // Real keyboard walks to open tiles beside/behind tall station silhouettes.
    for (const [id,x,y] of [["hall-lamp",16,11],["altar",12,18],["gate",22,8]]) {
      await walk(page,{x,y});
      await page.screenshot({path:`${out}/${name}-behind-${id}.png`});
    }
    // Literal clear-floor steps traced from the painting: a BFS-only check cannot catch phantom walls.
    const floorSteps = [[37,11,0,-1],[39,11,1,0],[25,18,1,0],[10,10,0,-1],[42,17,1,0],
      [15,22,1,0],[26,23,0,-1],[12,12,1,0],[22,19,1,0],[44,21,0,1]];
    for (const [x,y,dx,dy] of floorSteps) {
      await walk(page,{x,y});
      await page.keyboard.press(dx===1?"ArrowRight":dy===-1?"ArrowUp":"ArrowDown");
      assert.deepEqual(await position(page),{x:x+dx,y:y+dy},`clear-floor step ${x},${y}`);
      await page.waitForTimeout(145);
    }
    await walk(page,{x:32,y:11});
    await tapWorld(page,34*32+16,11*32+30);
    await page.waitForFunction(()=>{const c=document.querySelector("canvas[data-scene=camp]");return c.dataset.playerX==="34" && c.dataset.playerY==="11";});
    assert.equal(await page.getByRole("dialog").count(),0,"empty forge floor must not open Armory");
    await page.screenshot({path:`${out}/${name}-anvil-floor.png`});
    if (name==="phone") {
      await walk(page,{x:24,y:24});
      await page.getByRole("button",{name:"Move up",exact:true}).click();
      assert.deepEqual(await position(page),{x:24,y:23});
    }
    results[name]={viewport:[width,height],opened,keyboardWalks:true,groundTap:true,buildingTaps:true,clearFloorSteps:floorSteps.length,forgeFloorTap:true};
    await context.close();
    console.log(`${name}: all seven panels, E, painted taps, walking and depth views passed`);
  }

  const {page,context}=await session(1280,800,"render-fixtures");
  // Pixel tests use the production renderer, with no crowd and fixed lighting/labels.
  results.render=await page.evaluate(async()=>{
    const {drawCamp,campFootBaseline}=await import("/src/render/camp-renderer.ts");
    const {CAMP_OCCLUDERS,inCampPolygon}=await import("/src/game/camp-art.ts");
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
    const depth=[];
    for(const [id,x,y] of [["hall-lamp",16,11],["altar",12,18],["gate",22,8],["board",43,19]]) {
      const frame={...f,playerPos:{x,y}};
      const visible=pixels(frame),absent=pixels({...frame,hero:{...f.hero,offX:10000}});
      const blockers=CAMP_OCCLUDERS.filter(o=>(o.station===id || o.id===id) && o.baseline>campFootBaseline(y));
      let covered=0,leaked=0,shown=0;
      const solo=document.createElement("canvas");solo.width=1536;solo.height=1024;
      const single=solo.getContext("2d");
      const {drawHero}=await import("/src/render/mob-art.ts");
      drawHero(single,f.hero,x*32,y*32,32,"rgba(0,0,0,0)");
      const sprite=single.getImageData(0,0,1536,1024).data;
      for(let py=y*32-30;py<y*32+32;py++)for(let px=x*32-25;px<x*32+58;px++) {
        const p=(py*1536+px)*4;
        if(sprite[p+3]!==255)continue;
        const blocked=blockers.some(o=>[-1,0,1].every(dx=>[-1,0,1].every(dy=>inCampPolygon(px+dx,py+dy,o.polygon))));
        const differs=visible[p]!==absent[p]||visible[p+1]!==absent[p+1]||visible[p+2]!==absent[p+2];
        // Behind a silhouette the delver shows only as a faint ghost (45%): the painting must still win there.
        const ghost=[0,1,2].reduce((sum,c)=>sum+Math.abs(visible[p+c]-absent[p+c]),0);
        const full=[0,1,2].reduce((sum,c)=>sum+Math.abs(sprite[p+c]-absent[p+c]),0);
        if(blocked){covered++;if(ghost>0.6*full+12)leaked++;}else if(differs)shown++;
      }
      depth.push({id,covered,leaked,shown});
    }
    const clearFloor=[];
    for(const [id,x,y] of [["hall-stairs",10,9],["altar-front",7,20],["vault-stairs",42,17],
      ["anvil-left",34,11],["anvil-right",37,10],["forge-rack-front",32,11],["forge-barrel-front",40,11],
      ["fire-left",22,19],["fire-right",25,18],["tent-front",16,20],["guide-side",26,23]]) {
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
    return {reducedMotionStill:still,animatedPixels:changed,depth,clearFloor,frameMsMedian:times[Math.floor(times.length/2)],frameMsP95:times[Math.floor(times.length*.95)]};
  });
  assert.equal(results.render.reducedMotionStill,true);
  assert(results.render.animatedPixels>100);
  for(const d of results.render.depth){assert(d.covered>0,`${d.id}: no actual occlusion checked`);assert(d.leaked<=d.covered*0.02,`${d.id}: delver drawn over the painting, not behind it`);assert(d.shown>0,`${d.id}: delver wholly hidden`);}
  for(const d of results.render.clearFloor)assert(d.shown>400,`${d.id}: delver hidden by painted floor (${d.shown} visible pixels)`);
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
