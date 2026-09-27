'use strict';

class MonsterManager {
  constructor({ types, zones, spawnManager, players, send, now=Date.now, rng=Math.random, aoiRadius=110 }) {
    this.types=types; this.zones=zones; this.spawnManager=spawnManager;this.players=players;this.send=send;this.now=now;this.rng=rng;this.aoiRadius=aoiRadius;
    this.monsters=new Map();this.nextId=1;this.combat=null;this.lastNetworkAt=0;
  }
  setCombatManager(combat){this.combat=combat;}
  initialize(){
    for(const [key,type] of Object.entries(this.types)){
      for(let i=0;i<type.count;i++)this.spawn(key,false);
      if(key==='bolota')this.spawn(key,true);
    }
  }
  spawn(key,giant=false,existing=null){
    const type=this.types[key],point=this.spawnManager.point(key); if(!type)throw new Error(`Tipo desconhecido: ${key}`);
    const level=giant?6:Math.floor(type.levels[0]+this.rng()*(type.levels[1]-type.levels[0]+1)); const k=giant?6:1;
    const m=existing||{id:this.nextId++};
    Object.assign(m,{key,name:giant?`Bolota Gigante` : type.name,zone:key,x:point.x,z:point.z,spawnX:point.x,spawnZ:point.z,level,giant,
      aggressive:type.aggressive,speed:type.speed,radius:type.radius,material:type.material,maxHp:Math.round((22+level*16)*k),
      attack:(3+level*2.4)*(giant?1.5:1),defense:level*0.7,exp:Math.round((10+level*7)*k*(type.expMultiplier||1)),hp:0,
      state:'idle',targetId:null,dead:false,deathAt:0,nextThinkAt:0,nextAttackAt:0,wanderX:point.x,wanderZ:point.z,slowUntil:0});
    m.hp=m.maxHp;this.monsters.set(m.id,m);this.emit(m,{t:'monsterSpawn',monster:this.public(m)});return m;
  }
  get(id){return this.monsters.get(Number(id));}
  near(x,z,radius){return [...this.monsters.values()].filter(m=>Math.hypot(m.x-x,m.z-z)<=radius);}
  public(m){return{id:m.id,key:m.key,name:m.name,x:m.x,z:m.z,level:m.level,giant:m.giant,radius:m.radius,hp:m.hp,maxHp:m.maxHp,state:m.state,dead:m.dead};}
  snapshotFor(player){return[...this.monsters.values()].filter(m=>Math.hypot(m.x-player.x,m.z-player.z)<=this.aoiRadius).map(m=>this.public(m));}
  emit(m,message){for(const p of this.players.values())if(Math.hypot(m.x-p.x,m.z-p.z)<=this.aoiRadius)this.send(p.ws,message);}
  tick(dt){
    const now=this.now(),network=now-this.lastNetworkAt>=200;
    for(const m of this.monsters.values()){
      if(m.dead){const delay=m.giant?45000:9000;if(now-m.deathAt>=delay){this.spawn(m.key,m.giant,m);}continue;}
      let target=m.targetId&&this.players.get(m.targetId);
      if(target&&(target.dead||Math.hypot(target.x-m.spawnX,target.z-m.spawnZ)>Math.max(28,this.zones[m.zone].radius*1.8)))target=null;
      if(!target&&m.aggressive)target=this.closestPlayer(m,9+Math.min(5,m.level*.08));
      if(target){m.targetId=target.id;const distance=Math.hypot(target.x-m.x,target.z-m.z);const attackRange=m.radius+1.15;
        if(distance<=attackRange){m.state='attack';if(now>=m.nextAttackAt){m.nextAttackAt=now+1600;this.combat.monsterAttack(m,target);}}
        else{m.state='chase';this.moveToward(m,target.x,target.z,dt,now);}
      }else{
        m.targetId=null;const homeDistance=Math.hypot(m.x-m.spawnX,m.z-m.spawnZ);
        if(homeDistance>2){m.state='return';this.moveToward(m,m.spawnX,m.spawnZ,dt,now);}
        else if(now>=m.nextThinkAt){m.nextThinkAt=now+1800+this.rng()*3200;const a=this.rng()*Math.PI*2,r=this.rng()*this.zones[m.zone].radius*.45;m.wanderX=m.spawnX+Math.cos(a)*r;m.wanderZ=m.spawnZ+Math.sin(a)*r;m.state=this.rng()<.65?'wander':'idle';}
        else if(m.state==='wander'&&Math.hypot(m.x-m.wanderX,m.z-m.wanderZ)>.5)this.moveToward(m,m.wanderX,m.wanderZ,dt,now,.45);
      }
      if(network)this.emit(m,{t:'monsterMove',id:m.id,x:m.x,z:m.z,state:m.state,targetId:m.targetId,hp:m.hp});
    }
    if(network)this.lastNetworkAt=now;
  }
  moveToward(m,x,z,dt,now,mult=1){const dx=x-m.x,dz=z-m.z,len=Math.hypot(dx,dz)||1;const slow=m.slowUntil>now?.6:1;const step=Math.min(len,m.speed*slow*mult*dt);m.x+=dx/len*step;m.z+=dz/len*step;}
  closestPlayer(m,radius){let best=null,bestD=radius;for(const p of this.players.values()){if(p.dead||[4,5,6].includes(p.a))continue;const d=Math.hypot(p.x-m.x,p.z-m.z);if(d<bestD){best=p;bestD=d;}}return best;}
}

module.exports = MonsterManager;
