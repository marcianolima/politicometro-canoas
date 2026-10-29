import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";

const base=process.env.SMOKE_BASE||"http://127.0.0.1:8765/";
fs.mkdirSync("smoke-artifacts",{recursive:true});
const browser=await chromium.launch({headless:true});
let success=0;

async function one(label, viewport){
 const page=await browser.newPage({viewport,locale:"pt-BR",reducedMotion:"reduce"});
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 const response=await page.goto(base,{waitUntil:"domcontentloaded",timeout:25000});
 assert.equal(response.status(),200,"Home HTTP 200");
 await page.locator("#people .person-card").first().waitFor({timeout:20000});
 assert.equal(await page.locator("#people .person-card").count(),23,"23 eleitos");
 await page.locator('[data-role="legislativo"]').click();
 assert.equal(await page.locator("#people .person-card").count(),21,"21 vereadores");
 await page.locator('[data-role="executivo"]').click();
 assert.equal(await page.locator("#people .person-card").count(),2,"prefeito e vice");
 await page.locator('[data-role="todos"]').click();
 await page.locator("#search").fill("Gabriel");
 assert.equal(await page.locator("#people .person-card").count(),1,"busca textual");
 await page.locator("#people .person-card").first().click();
 assert.equal(await page.locator("#modal").isHidden(),false,"ficha modal");
 await page.locator('[data-tab="eleicao"]').click();
 assert.equal(await page.locator("#profileTab").isVisible(),true);
 await page.keyboard.press("Escape");
 assert.equal(await page.locator("#modal").isHidden(),true,"ESC fecha modal");
 await page.locator("#search").fill("");
 await page.locator("#electionBars .candidate-bar").first().waitFor({timeout:20000});
 assert.equal(await page.locator("#electionBars .candidate-bar").count(),6,"seis candidatos prefeito no 1º turno");
 await page.locator("#electionGroup").selectOption("pref2");
 assert.equal(await page.locator("#electionBars .candidate-bar").count(),2,"dois no 2º turno");
 await page.locator("#electionGroup").selectOption("council");
 assert.equal(await page.locator("#electionBars .candidate-bar").count(),21,"21 vereadores na análise eleitoral");
 assert.equal(await page.locator("#currentCouncil .council-member").count(),21,"fotografia da Câmara");
 assert.equal(await page.locator("#senators .senator-card").count(),3,"três senadores RS");
 assert.ok(await page.locator("#cityMap path").count()>0,"malha SVG");
 const measured=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
 if(measured.width>measured.viewport+8)console.warn(label,"scroll horizontal:",measured);
 await page.screenshot({path:"smoke-artifacts/"+label+".png",fullPage:true});
 assert.deepEqual(errors,[],"erros JS não capturados");
 await page.close();
 console.log("E2E PASS",label,viewport.width+"x"+viewport.height);
 success++;
}

try{
 await one("desktop",{width:1365,height:900});
 await one("mobile",{width:390,height:844});
 console.log("E2E CONCLUÍDO",success,"dispositivos");
}finally{await browser.close()}
