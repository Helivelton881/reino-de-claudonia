'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ClaudoniaWorldCollision=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const R=185,TOWN=20,LAKE={x:-80,z:98,r:20};
  const ZONES=[
    {key:'bolota',x:30,z:32,r:16},{key:'coelhorn',x:-42,z:40,r:18},
    {key:'cogumelo',x:-58,z:-38,r:18},{key:'javali',x:62,z:-32,r:18},
    {key:'golem',x:5,z:-88,r:20},{key:'lobo',x:105,z:42,r:22},
    {key:'aranha',x:-105,z:-85,r:22},{key:'espirito',x:-80,z:98,r:24},
    {key:'ciclope',x:40,z:128,r:22}
  ];
  const PATHS=ZONES.map(z=>[[0,0],[z.x*.5+(z.z>0?8:-8),z.z*.5+(z.x>0?-6:6)],[z.x,z.z]]);
  const OPEN_HALLS=[[0,27],[27,0],[-27,0],[-19,-19]];
  const ISLANDS=[
    {x:250,y:14,z:-60,r:13},{x:-260,y:24,z:-40,r:15},
    {x:60,y:8,z:265,r:11},{x:-170,y:34,z:210,r:14},
    {x:210,y:28,z:160,r:10},{x:-40,y:44,z:-270,r:16},
    {x:160,y:20,z:-220,r:12},{x:-280,y:16,z:120,r:11}
  ];
  const STATIC_NPCS=[
    {id:'guerreiro',x:7.5,z:4.7,r:.6,kind:'npc'},
    {id:'druida',x:-7.5,z:4.7,r:.6,kind:'npc'},
    {id:'mago',x:-6.8,z:-6.1,r:.6,kind:'npc'},
    {id:'arqueiro',x:6.8,z:-6.1,r:.6,kind:'npc'},
    {id:'voo',x:0,z:-10,r:.6,kind:'npc'},
    {id:'ferreiro',x:6,z:9.5,r:.6,kind:'npc'},
    {id:'vigia_lobos',x:82,z:30,r:.6,kind:'npc'},
    {id:'batedora_teias',x:-82,z:-60,r:.6,kind:'npc'}
  ];
  const COTTAGES=[];
  for(let i=0;i<11;i++){
    const a=i/11*Math.PI*2+.2,r=40+(i%3)*7,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(distPath(x,z)>=6)COTTAGES.push({x,z,s:.9+(i%2)*.2});
  }
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
  function smooth(a,b,x){const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}
  function distPath(x,z){
    let best=Infinity;
    for(const P of PATHS)for(let i=0;i<P.length-1;i++){
      const [ax,az]=P[i],[bx,bz]=P[i+1],vx=bx-ax,vz=bz-az,l2=vx*vx+vz*vz;
      const t=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/l2));
      const dx=x-(ax+vx*t),dz=z-(az+vz*t);best=Math.min(best,dx*dx+dz*dz);
    }
    return Math.sqrt(best);
  }
  function heightAt(x,z){
    const dd=Math.hypot(x,z),ang=Math.atan2(z,x);
    let h=2.2*Math.sin(x*.035+1.3)*Math.cos(z*.03-.4)+1.1*Math.sin(x*.08+z*.06)+.5*Math.cos(z*.17-x*.05);
    h+=7*Math.exp(-((x-62)**2+(z+32)**2)/500);
    h+=5*Math.exp(-((x+58)**2+(z+38)**2)/600);
    h+=9*Math.exp(-((x-5)**2+(z+88)**2)/700);
    h+=6*Math.exp(-((x-40)**2+(z-128)**2)/800);
    h+=4*Math.exp(-((x-105)**2+(z-42)**2)/700);
    h+=smooth(R*.7,R*.88,dd)*(12+7*Math.sin(ang*7)+5*Math.sin(ang*13+1));
    h=Math.max(h,-.6)+1.2;h=1.2+(h-1.2)*smooth(TOWN+6,TOWN+18,dd);
    const dl=Math.hypot(x-LAKE.x,z-LAKE.z);if(dl<LAKE.r+10){const k=smooth(LAKE.r-6,LAKE.r+10,dl);h=h*k+(-1.6)*(1-k);}
    return h*(1-smooth(R*.94,R,dd));
  }
  function zoneKeyAt(x,z){for(const q of ZONES)if(Math.hypot(x-q.x,z-q.z)<q.r+10)return q.key;return null;}
  function inZoneCore(x,z){return ZONES.some(q=>Math.hypot(x-q.x,z-q.z)<q.r*.55);}
  function nearHouse(x,z,pad){return COTTAGES.some(c=>Math.hypot(c.x-x,c.z-z)<3.3*c.s+pad)||OPEN_HALLS.some(([hx,hz])=>Math.hypot(hx-x,hz-z)<5.6+pad);}
  function freeSpot(x,z,minTown){
    const dd=Math.hypot(x,z);
    return dd>=minTown&&dd<=R-4&&Math.hypot(x-LAKE.x,z-LAKE.z)>=LAKE.r+3&&distPath(x,z)>=3.4;
  }
  function generateTrees(){
    const rand=mulberry32(20260927),out=[],occ=new Set();
    for(let i=0;i<9000&&out.length<420;i++){
      const a=rand()*Math.PI*2,rr=Math.sqrt(rand())*(R-6),x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      if(!freeSpot(x,z,36)||(inZoneCore(x,z)&&rand()<.8)||nearHouse(x,z,3))continue;
      const ck=Math.floor(x/3.6)+','+Math.floor(z/3.6);if(occ.has(ck))continue;occ.add(ck);
      const zk=zoneKeyAt(x,z),y=heightAt(x,z),r=rand();let kind='common';
      if(zk==='aranha'||zk==='cogumelo')kind=r<.55?'twisted':'common';
      else if(zk==='golem'||zk==='ciclope')kind=r<.45?'dead':'pine';
      else if(zk==='javali')kind=r<.3?'dead':r<.5?'pine':'common';
      else if(zk==='lobo'||y>9)kind=r<.75?'pine':'common';
      else kind=r<.12?'pine':r<.15?'dead':'common';
      const rot=rand()*6.28;let model,h;
      if(kind==='common'){model=rand()<.5?'CommonTree_3':'CommonTree_5';h=6+rand()*3.5;}
      else if(kind==='pine'){model='Pine_2';h=7+rand()*3.5;}
      else if(kind==='twisted'){model='TwistedTree_1';h=7+rand()*2.5;}
      else{model='DeadTree_1';h=7+rand()*3;}
      out.push({x,z,kind,model,h,rot,r:kind==='twisted'?.9:.55});
    }
    return out;
  }
  function scatter(seed,count,place){
    const rand=mulberry32(seed),out=[];
    for(let i=0;i<count*6&&out.length<count;i++){
      const a=rand()*Math.PI*2,rr=Math.sqrt(rand())*(R-6),x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      const v=place(x,z,rand);if(!v)continue;out.push(Object.assign({x,z,rot:rand()*6.28},v));
    }
    return out;
  }
  function generateBushes(){
    return scatter(20260928,120,(x,z,rand)=>{
      if(!freeSpot(x,z,TOWN+6)||heightAt(x,z)>10||nearHouse(x,z,1))return null;
      const h=1.2+rand()*.9;
      return {model:rand()<.45?'Bush_Common_Flowers':'Bush_Common',h,solid:h>1.8,r:.7};
    });
  }
  function generateRocks(){
    return scatter(20260929,240,(x,z,rand)=>{
      if(Math.hypot(x,z)<TOWN+8||distPath(x,z)<3||Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.r+6||nearHouse(x,z,1))return null;
      const zk=zoneKeyAt(x,z);if(!(zk==='golem'||zk==='ciclope'||zk==='javali')&&rand()<.45)return null;
      const h=.5+rand()*1.9;
      return {model:rand()<.5?'Rock_Medium_1':'Rock_Medium_3',h,solid:h>1.2,r:.35*h+.2};
    });
  }
  const STATIC_PROP_COLLIDERS = [
    {id:'prop-1',x:-0.6,z:27.3,r:1.5381861448287966,kind:'prop'},
    {id:'prop-2',x:-27,z:2.3,r:1.5381861448287966,kind:'prop'},
    {id:'prop-3',x:2.7,z:28.7,r:0.7318768429756166,kind:'prop'},
    {id:'prop-4',x:-3,z:28.9,r:0.37692876219749455,kind:'prop'},
    {id:'prop-5',x:-14.363497034479494,z:33.37384684061008,r:0.37692876219749455,kind:'prop'},
    {id:'prop-6',x:23.18417368315511,z:-27.97530680134354,r:0.37692876219749455,kind:'prop'},
    {id:'prop-7',x:-3,z:27.8,r:0.37692876219749455,kind:'prop'},
    {id:'prop-8',x:-22.082929943746766,z:12.10926112938244,r:0.37692876219749455,kind:'prop'},
    {id:'prop-9',x:27.2,z:1.2,r:0.5840424245595933,kind:'prop'},
    {id:'prop-10',x:29,z:-1.6,r:1.0903122997283938,kind:'prop'},
    {id:'prop-11',x:29.1,z:2.6,r:0.7471257162094117,kind:'prop'},
    {id:'prop-12',x:27.4,z:-3,r:0.49048910379409794,kind:'prop'},
    {id:'prop-13',x:23.62809724431395,z:-9.015155052091092,r:0.49048910379409794,kind:'prop'},
    {id:'prop-14',x:-6.861538461538462,z:-25.307692307692307,r:0.49048910379409794,kind:'prop'},
    {id:'prop-15',x:-49.87848565086309,z:6.598512648820571,r:0.49048910379409794,kind:'prop'},
    {id:'prop-16',x:26.1,z:-3,r:0.46757173061370855,kind:'prop'},
    {id:'prop-17',x:-29.2,z:-2.3,r:0.7890434288978577,kind:'prop'},
    {id:'prop-18',x:-29.2,z:2.3,r:0.7353872966766358,kind:'prop'},
    {id:'prop-19',x:-27.5,z:3.061616997868383e-17,r:0.5341145682334901,kind:'prop'},
    {id:'prop-20',x:-29.4,z:1.4695761589768238e-16,r:0.672415680885315,kind:'prop'},
    {id:'prop-21',x:-26.8,z:-2.6,r:0.35,kind:'prop'},
    {id:'prop-22',x:-18.010050506338832,z:-21.68700576850888,r:1.3024249935150147,kind:'prop'},
    {id:'prop-23',x:-21.68700576850888,z:-18.010050506338832,r:1.3024249935150147,kind:'prop'},
    {id:'prop-24',x:-16.17157287525381,z:-19.848528137423855,r:1.08,kind:'prop'},
    {id:'prop-25',x:-19.848528137423855,z:-16.17157287525381,r:1.08,kind:'prop'},
    {id:'prop-26',x:-23.917070056253234,z:7.890738870617559,r:0.38191689848899846,kind:'prop'},
    {id:'prop-27',x:-7.876923076923077,z:-24.884615384615383,r:0.38191689848899846,kind:'prop'},
    {id:'prop-28',x:-19.25782032839834,z:-38.80592810640054,r:0.38191689848899846,kind:'prop'},
    {id:'prop-29',x:-24.35566877880913,z:6.8819618087390015,r:0.38191689848899846,kind:'prop'},
    {id:'prop-30',x:15,z:20,r:1.6310940778255465,kind:'prop'}
  ];
  let cache=null;
  function generate(){if(!cache)cache={trees:generateTrees(),bushes:generateBushes(),rocks:generateRocks()};return cache;}
  function solidNaturalColliders(){
    const w=generate(),out=w.trees.map(t=>({x:t.x,z:t.z,r:t.r,kind:'tree'}));
    for(const b of w.bushes)if(b.solid)out.push({x:b.x,z:b.z,r:b.r,kind:'bush'});
    for(const r of w.rocks)if(r.solid)out.push({x:r.x,z:r.z,r:r.r,kind:'rock'});
    return out;
  }
  return {R,TOWN,LAKE,ZONES,COTTAGES,OPEN_HALLS,ISLANDS,STATIC_NPCS,STATIC_PROP_COLLIDERS,heightAt,distPath,zoneKeyAt,generate,solidNaturalColliders};
});
