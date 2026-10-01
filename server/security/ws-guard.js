'use strict';
const LIMITS={pos:{rate:25,burst:35},chat:{rate:3,burst:6},attack:{rate:12,burst:18},skill:{rate:8,burst:12},worldSnapshot:{rate:2,burst:4},save:{rate:2,burst:3},default:{rate:20,burst:30}};
class WsGuard{
 constructor({now=()=>Date.now(),maxJson=60000,maxStrikes=8}={}){this.now=now;this.maxJson=maxJson;this.maxStrikes=maxStrikes;this.state=new WeakMap();}
 check(ws,msg,rawLength=0){if(!msg||typeof msg!=='object'||Array.isArray(msg)||typeof msg.t!=='string'||msg.t.length>40)return this.bad(ws,'envelope');if(rawLength>this.maxJson)return this.bad(ws,'payload');const now=this.now(),s=this.state.get(ws)||{last:now,buckets:{},strikes:0};this.state.set(ws,s);const cfg=LIMITS[msg.t]||LIMITS.default,b=s.buckets[msg.t]||{tokens:cfg.burst,at:now};b.tokens=Math.min(cfg.burst,b.tokens+(now-b.at)/1000*cfg.rate);b.at=now;if(b.tokens<1){s.strikes++;return{ok:false,reason:'rate-limit',close:s.strikes>=this.maxStrikes};}b.tokens-=1;s.buckets[msg.t]=b;if(s.strikes>0)s.strikes--;return{ok:true};}
 bad(ws,reason){const s=this.state.get(ws)||{last:this.now(),buckets:{},strikes:0};s.strikes+=2;this.state.set(ws,s);return{ok:false,reason,close:s.strikes>=this.maxStrikes};}
}
module.exports=WsGuard;