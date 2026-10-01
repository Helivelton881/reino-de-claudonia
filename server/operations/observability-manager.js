'use strict';
class ObservabilityManager{
 constructor({maxEvents=500}={}){this.maxEvents=maxEvents;this.startedAt=Date.now();this.counters={sessions:0,authOk:0,authFail:0,messages:0,rateLimited:0,errors:0,drops:0,dungeons:0,pvp:0,economy:0};this.latencies=[];this.events=[];this.online=0;}
 inc(k,n=1){this.counters[k]=(this.counters[k]||0)+n;}
 setOnline(n){this.online=Math.max(0,Number(n)||0);}
 latency(ms){if(Number.isFinite(ms)){this.latencies.push(Math.max(0,ms));if(this.latencies.length>200)this.latencies.shift();}}
 event(type,data={}){const safe={at:Date.now(),type:String(type).slice(0,48)};for(const [k,v] of Object.entries(data))if(['number','boolean'].includes(typeof v)||(['string'].includes(typeof v)&&!/(token|email|name|user|char)/i.test(k)))safe[k]=typeof v==='string'?v.slice(0,80):v;this.events.push(safe);if(this.events.length>this.maxEvents)this.events.shift();}
 error(area){this.inc('errors');this.event('error',{area:String(area||'server').slice(0,48)});}
 snapshot(){const a=[...this.latencies].sort((x,y)=>x-y),pct=p=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:0;return{uptimeMs:Date.now()-this.startedAt,online:this.online,counters:{...this.counters},latency:{samples:a.length,p50:pct(.5),p95:pct(.95),max:a.at(-1)||0},recent:this.events.slice(-50)};}
}
module.exports=ObservabilityManager;