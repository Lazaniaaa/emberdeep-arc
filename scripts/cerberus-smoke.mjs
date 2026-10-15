// Production Canvas renderer fixtures, isolated from the owner's save and wallet.
// SMOKE_CHANNEL=msedge node scripts/cerberus-smoke.mjs [baseUrl] [outDir]
import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {chromium} from "playwright";
const base=process.argv[2]??"http://127.0.0.1:5741/",out=process.argv[3]??"artifacts/cerberus";
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.SMOKE_CHANNEL||"msedge"});
const results={},errors=[];
try {
  for(const [name,width,height,zoom,vw,vh] of [["desktop",1280,900,2,12,10],["phone",375,812,1,11,14]]) {
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    await page.goto(base);await page.evaluate(()=>document.fonts.ready);
    const result=await page.evaluate(async({zoom,vw,vh})=>{
      const {drawRun,cameraFor}=await import("/src/render/renderer.ts");
      const {startRun,emptyBag,applyAction}=await import("/src/game/run.ts");
      const {NO_PERKS}=await import("/src/game/catalog.ts");
      const {generateFloor,isFloor}=await import("/src/game/dungeon.ts");
      const {createRng}=await import("/src/game/rng.ts");
      const {stepCost}=await import("/src/game/config.ts");
      const {cerberusSheet,cerberusFrame}=await import("/src/render/cerberus-sprites.ts");
      const {FxQueue}=await import("/src/render/fx.ts");
      const s=startRun({seed:70001,flasks:5,perks:{...NO_PERKS,radius:20},weaponDamage:8,bag:emptyBag()});
      s.depth=7;s.floor=generateFloor(createRng(7),7,{findPct:0});s.floor.items=[];s.floor.props=[];s.floor.seen.fill(1);s.light=1000;
      const original=s.floor.dimlings.find(d=>d.boss),f=s.floor;
      const spots=[];
      for(let y=2;y<f.h-3;y++)for(let x=2;x<f.w-3;x++) {
        if([[0,0],[1,0],[0,1],[1,1],[-1,0],[2,0],[0,-1],[0,2]].every(([dx,dy])=>isFloor(f,x+dx,y+dy)))spots.push({x,y});
      }
      spots.sort((a,b)=>Math.hypot(a.x-f.w/2,a.y-f.h/2)-Math.hypot(b.x-f.w/2,b.y-f.h/2));
      const b={...original,...spots[0],awake:true};s.floor.dimlings=[b];
      const positions={down:{x:b.x,y:b.y+2},left:{x:b.x-1,y:b.y},right:{x:b.x+2,y:b.y},up:{x:b.x,y:b.y-1}};
      const c=document.createElement("canvas");c.width=vw*32*zoom;c.height=vh*32*zoom;
      document.body.replaceChildren(c);document.body.style.cssText="margin:0;background:#11131e;display:grid;place-items:center;min-height:100vh";
      const ctx=c.getContext("2d"),calls=[],real=ctx.drawImage.bind(ctx);
      ctx.drawImage=(image,...args)=>{if(image instanceof HTMLImageElement&&image.src.includes("/bosses/cerberus.png"))calls.push(args.slice(0,4));real(image,...args);};
      const opts={zoom,view:cameraFor(b,f.w,f.h,vw,vh),time:0,reducedMotion:false,fx:new FxQueue(),
        hero:{animal:"cat-ginger-tabby",dir:"up",frame:"a",offX:0,offY:0,flash:0},playerPos:positions.down};
      const draw=time=>{opts.time=time;opts.playerPos=s.player;drawRun(ctx,s,opts);};
      s.player={...positions.down,facing:"up"};draw(0);
      for(let i=0;i<100&&!cerberusSheet();i++)await new Promise(r=>setTimeout(r,20));
      if(!cerberusSheet())throw new Error("Cerberus atlas did not load");
      await new Promise(r=>setTimeout(r,250));
      const frames=[];
      for(const [row,facing] of ["down","left","right","up"].entries())for(const [col,frame] of ["a","b","w","s"].entries()) {
        s.seed=80000+row*4+col;s.steps=0;s.events=[];s.player={...positions[facing],facing:"up"};
        if(frame==="b")b.x--;
        draw(1000);
        if(frame==="b")b.x++;
        if(frame==="w"||frame==="s"){s.steps=1;s.events=["drain"];}
        draw(2000);if(frame==="s")draw(2100);
        const got=calls.at(-1),expected=cerberusFrame(facing,frame);
        if(got[0]!==expected.x||got[1]!==expected.y)throw new Error(`${facing}/${frame}: wrong cell ${got}`);
        frames.push({facing,frame,source:got});
      }
      s.seed=90000;s.steps=0;s.events=[];s.player={...positions.down,facing:"up"};
      const after=applyAction(s,{type:"wait"}),damage=s.light-after.light-stepCost(7);
      opts.reducedMotion=true;draw(1000);const still=c.toDataURL();draw(1800);
      if(c.toDataURL()!==still)throw new Error("Reduced motion is not static");
      return {frames,damage,atlas:[cerberusSheet().image.naturalWidth,cerberusSheet().image.naturalHeight],
        reducedMotionStill:true,boss:{x:b.x,y:b.y,size:b.size,hp:b.hp},png:c.toDataURL().split(",")[1]};
    },{zoom,vw,vh});
    assert.equal(Math.round(result.damage*1e6)/1e6,40);
    assert.equal(result.frames.length,16);assert.deepEqual(result.atlas,[1024,896]);
    writeFileSync(`${out}/${name}-canvas.png`,Buffer.from(result.png,"base64"));delete result.png;
    await page.screenshot({path:`${out}/${name}.png`});results[name]=result;
    await context.close();
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2)+"\n");
  console.log("Cerberus: all 16 frames, four directions, 40 damage and reduced motion passed on desktop and phone.");
}finally{await browser.close();}
