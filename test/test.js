import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function loadLib(){
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const match = html.match(/<script type="module" id="botlib">([\s\S]*?)<\/script>/);
  if(!match) throw new Error('botlib module not found');
  const code = match[1];
  const uri = 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
  return import(uri);
}

const lib = await loadLib();
const {EMA,RSI,MACD,ATR,isBullishEngulfing,isBearishEngulfing,calcBackoff,Mutex,riskCheck} = lib;

// EMA
assert.ok(Math.abs(EMA(3,[1,2,3,4,5]) - 4.0625) < 1e-6);

// RSI
const rsiData=[44,44.15,43.84,44.09,43.9,44.35,44.53,44.38,44.15,43.61,44.07,44.47,44.36,44.53,44.8,45.1];
assert.ok(Math.abs(RSI(rsiData) - 63.4240529606) < 1e-6);

// MACD
const macdData=Array.from({length:50},(_,i)=>i+1);
const macdRes=MACD(macdData);
assert.ok(Math.abs(macdRes.macd - 6.050375378025926) < 1e-6);
assert.ok(Math.abs(macdRes.signal - 6.050375378025925) < 1e-6);

// ATR
const candles=[
  {open:10,high:11,low:9,close:10},
  {open:10,high:12,low:8,close:11},
  {open:11,high:13,low:10,close:12},
  {open:12,high:14,low:11,close:13}
];
assert.ok(Math.abs(ATR(candles,3) - 3.25) < 1e-6);

// Candle patterns
assert.ok(isBullishEngulfing({open:10,close:9},{open:8,close:11}));
assert.ok(isBearishEngulfing({open:9,close:10},{open:11,close:8}));

// Backoff full jitter
assert.equal(calcBackoff(3,500,15000,()=>1),4000);
assert.equal(calcBackoff(10,500,15000,()=>1),15000);

// Mutex
const m=new Mutex();
let ran1=false,ran2=false;
const p1=m.run(async()=>{ran1=true; await new Promise(r=>setTimeout(r,50));});
const p2=m.run(async()=>{ran2=true;});
await Promise.allSettled([p1,p2]);
assert.equal(ran1,true);
assert.equal(ran2,false);

// Risk gates
const state={equity:1000,daily_loss:0,daily_trades:0,consec_losses:0};
const cfg={stake_pct_of_equity:0.5,daily_loss_cap:50,daily_trade_cap:2,max_consecutive_losses:2};
let check=riskCheck(state,cfg);
assert.equal(check.allowed,true);
assert.ok(Math.abs(check.stake-5) < 1e-6);
check=riskCheck({...state,daily_loss:60},cfg);
assert.equal(check.allowed,false);
assert.equal(check.reason,'daily_loss_cap');
check=riskCheck({...state,consec_losses:3},cfg);
assert.equal(check.allowed,false);
assert.equal(check.reason,'max_consecutive_losses');

console.log('tests passed');
