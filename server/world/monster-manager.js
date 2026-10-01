'use strict';

const {VARIANTS,FAMILY_SKILLS,WORLD_BOSSES,variantForSpawn}=require('../data/monster-ecosystem');

class MonsterManager {
  constructor({ types, zones, spawnManager, players, send, navigation=null, now=Date.now, rng=Math.random, aoiRadius=110 }) {
    this.types=types;
    this.zones=zones;
    this.spawnManager=spawnManager;
    this.players=players;
    this.send=send;
    this.navigation=navigation;
    this.now=now;
    this.rng=rng;
    this.aoiRadius=aoiRadius;
    this.monsters=new Map();
    this.nextId=1;
    this.combat=null;
    this.lastNetworkAt=0;
    this.navPlansThisTick=0;
    this.maxNavPlansPerTick=8;
  }

  setCombatManager(combat){ this.combat=combat; }

  initialize(){
    for(const [key,type] of Object.entries(this.types)){
      for(let i=0;i<type.count;i++) this.spawn(key,false,null,variantForSpawn(this.rng));
      this.spawn(key,true);
    }
  }

  spawn(key,giant=false,existing=null,variant=null){
    const type=this.types[key], point=this.spawnManager.point(key);
    if(!type) throw new Error(`Tipo desconhecido: ${key}`);
    const variantId=giant?'giant':(variant||'normal'),v=VARIANTS[variantId]||VARIANTS.normal;
    const level=giant?Math.min(60,type.levels[1]+3):Math.floor(type.levels[0]+this.rng()*(type.levels[1]-type.levels[0]+1));
    const m=existing||{id:this.nextId++};
    Object.assign(m,{
      key,
      name:giant?`${type.name} Gigante`:variantId==='normal'?type.name:`${type.name} ${v.name}`,
      zone:key,
      x:point.x,z:point.z,
      spawnX:point.x,spawnZ:point.z,
      level,giant,
      variant:variantId,
      aggressive:giant?true:type.aggressive,
      speed:type.speed,
      radius:type.radius*v.scale,
      material:type.material,
      maxHp:Math.round((22+level*16)*v.hp),
      attack:(3+level*2.4)*v.attack,
      defense:level*0.7*v.defense,
      exp:Math.round((10+level*7)*v.exp*(type.expMultiplier||1)),
      respawnMs:v.respawnMs,
      skills:FAMILY_SKILLS[key]||[],
      resistances:giant?{stun:.5,root:.4,slow:.3}:{},
      contributions:new Map(),
      hp:0,
      state:'idle',
      targetId:null,
      dead:false,
      deathAt:0,
      nextThinkAt:0,
      nextAttackAt:0,
      wanderX:point.x,
      wanderZ:point.z,
      slowUntil:0,
      rootUntil:0,
      stunUntil:0,
      tauntUntil:0,
      effects:{},
      navPath:[],
      navIndex:0,
      navTargetX:null,
      navTargetZ:null,
      navReplanAt:0,
      returning:false,
      returnStartedAt:0
    });
    m.hp=m.maxHp;
    this.monsters.set(m.id,m);
    this.emit(m,{t:'monsterSpawn',monster:this.public(m)});
    return m;
  }

  get(id){ return this.monsters.get(Number(id)); }
  near(x,z,radius){ return [...this.monsters.values()].filter(m=>Math.hypot(m.x-x,m.z-z)<=radius); }
  public(m){ return {id:m.id,key:m.key,name:m.name,x:m.x,z:m.z,level:m.level,giant:m.giant,variant:m.variant||'normal',worldBoss:!!m.worldBoss,radius:m.radius,hp:m.hp,maxHp:m.maxHp,state:m.state,dead:m.dead,phase:m.phase||1}; }
  recordContribution(m,playerId,damage){if(!m||!playerId||damage<=0)return;const map=m.contributions||(m.contributions=new Map());map.set(playerId,(map.get(playerId)||0)+damage);}
  contributionShares(m){const entries=[...(m.contributions||new Map()).entries()],total=entries.reduce((s,x)=>s+x[1],0)||1;return entries.map(([playerId,damage])=>({playerId,damage,share:damage/total}));}
  eligibleContributors(m,minShare=.03){return this.contributionShares(m).filter(x=>x.share>=minShare);}
  spawnWorldBoss(id='guardiao_cinzas',existing=null){
    const cfg=WORLD_BOSSES[id];if(!cfg)throw new Error(`World Boss desconhecido: ${id}`);
    const point=this.spawnManager.point(cfg.zone),m=existing||{id:this.nextId++};
    Object.assign(m,{key:id,name:cfg.name,zone:cfg.zone,x:point.x,z:point.z,spawnX:point.x,spawnZ:point.z,level:cfg.level,giant:true,worldBoss:true,variant:'worldBoss',aggressive:true,speed:cfg.speed,radius:cfg.radius,material:'boss',maxHp:cfg.hp,hp:cfg.hp,attack:cfg.attack,defense:cfg.defense,exp:cfg.level*120,respawnMs:cfg.respawnMs,skills:[],resistances:{stun:.85,root:.85,slow:.65},contributions:new Map(),phase:1,bossConfig:cfg,state:'idle',targetId:null,dead:false,deathAt:0,nextThinkAt:0,nextAttackAt:0,nextBossSkillAt:0,wanderX:point.x,wanderZ:point.z,slowUntil:0,rootUntil:0,stunUntil:0,tauntUntil:0,effects:{},navPath:[],navIndex:0,navTargetX:null,navTargetZ:null,navReplanAt:0,returning:false,returnStartedAt:0});
    this.monsters.set(m.id,m);this.emit(m,{t:'worldBossSpawn',boss:this.public(m)});return m;
  }
  updateBossPhase(m){if(!m.worldBoss||!m.bossConfig)return;const ratio=m.hp/m.maxHp,phases=m.bossConfig.phases;let phase=1;for(let i=0;i<phases.length;i++)if(ratio<=phases[i].at)phase=i+1;if(phase!==m.phase){m.phase=phase;const cfg=phases[phase-1];if(cfg.enrage)m.attack=m.bossConfig.attack*cfg.enrage;this.emit(m,{t:'worldBossPhase',id:m.id,phase,adds:cfg.adds||null,enrage:cfg.enrage||1});if(cfg.adds){for(let i=0;i<2;i++)this.spawn(cfg.adds,false,null,'elite');}}}
  bossSkill(m,target,now){if(!m.worldBoss||!target||now<(m.nextBossSkillAt||0))return false;const phase=m.bossConfig.phases[(m.phase||1)-1],skills=phase.skills||[];if(!skills.length)return false;const skill=skills[Math.floor(this.rng()*skills.length)],telegraphMs=skill.includes('meteor')?1600:1100;m.nextBossSkillAt=now+6500;this.emit(m,{t:'bossTelegraph',id:m.id,skill,x:target.x,z:target.z,radius:skill.includes('circular')?6:4,executeAt:now+telegraphMs});return true;}
  snapshotFor(player){ return [...this.monsters.values()].filter(m=>Math.hypot(m.x-player.x,m.z-player.z)<=this.aoiRadius).map(m=>this.public(m)); }
  emit(m,message){ for(const p of this.players.values()) if(Math.hypot(m.x-p.x,m.z-p.z)<=this.aoiRadius) this.send(p.ws,message); }

  clearNavigation(m){
    m.navPath=[];
    m.navIndex=0;
    m.navTargetX=null;
    m.navTargetZ=null;
    m.navReplanAt=0;
  }

  finishReturn(m,now){
    m.returning=false;
    m.returnStartedAt=0;
    this.clearNavigation(m);
    m.state='idle';
    m.nextThinkAt=now+1200+this.rng()*1800;
  }

  navPad(m){ return Math.max(0.4,m.radius*0.6); }

  canAttackThroughWorld(m,target){
    if(!this.navigation) return true;
    return this.navigation.lineClear(m.x,m.z,target.x,target.z,Math.min(0.18,this.navPad(m)*0.35));
  }

  ensureNavigation(m,x,z,now,range=0){
    if(!this.navigation) return false;
    const targetMoved=m.navTargetX===null || Math.hypot(x-m.navTargetX,z-m.navTargetZ)>1.25;
    const hasRoute=m.navIndex<m.navPath.length;
    if(hasRoute && !targetMoved) return true;
    if(now<m.navReplanAt && hasRoute) return true;
    if(now<m.navReplanAt && !hasRoute) return false;
    if(this.navPlansThisTick>=this.maxNavPlansPerTick) return false;
    this.navPlansThisTick++;

    const pad=this.navPad(m);
    const start={x:m.x,z:m.z};
    let result;
    if(range>0 && typeof this.navigation.findApproachPath==='function'){
      result=this.navigation.findApproachPath(start,{x,z},range,pad);
      m.navPath=result?result.path:[];
    }else{
      m.navPath=this.navigation.findPath(start,{x,z},pad);
    }

    m.navIndex=0;
    m.navTargetX=x;
    m.navTargetZ=z;
    m.navReplanAt=now+450;
    return m.navPath.length>0;
  }

  routeDirection(m){
    const tolerance=Math.max(0.35,m.radius*0.3);
    let p=m.navPath[m.navIndex];
    while(p && Math.hypot(p.x-m.x,p.z-m.z)<=tolerance){
      m.navIndex++;
      p=m.navPath[m.navIndex];
    }
    if(!p) return null;
    const dx=p.x-m.x,dz=p.z-m.z,len=Math.hypot(dx,dz)||1;
    return {x:dx/len,z:dz/len,distance:len};
  }

  tick(dt){
    const now=this.now(), network=now-this.lastNetworkAt>=200;
    this.navPlansThisTick=0;

    for(const m of this.monsters.values()){
      if(m.worldBoss&&!m.dead)this.updateBossPhase(m);
      if(m.dead){
        const delay=m.respawnMs||(m.giant?300000:9000);
        if(now-m.deathAt>=delay){if(m.worldBoss)this.spawnWorldBoss(m.key,m);else this.spawn(m.key,m.giant,m,m.variant);}
        continue;
      }

      if(m.stunUntil>now){m.state='stunned';if(network)this.emit(m,{t:'monsterMove',id:m.id,x:m.x,z:m.z,state:m.state,targetId:m.targetId,hp:m.hp});continue;}
      let target=m.targetId&&this.players.get(m.targetId);
      if(target&&(target.dead||target.invisible||Math.hypot(target.x-m.spawnX,target.z-m.spawnZ)>Math.max(28,this.zones[m.zone].radius*1.8))){
        target=null;
        this.clearNavigation(m);
      }
      // voltando para casa não puxa aggro de novo (antes alternava chase/return a cada tick na borda do leash)
      if(!target&&m.aggressive&&!m.returning) target=this.closestPlayer(m,9+Math.min(5,m.level*.08));

      if(target){
        m.targetId=target.id;
        m.returnStartedAt=0;
        if(m.worldBoss)this.bossSkill(m,target,now);
        const distance=Math.hypot(target.x-m.x,target.z-m.z);
        const attackRange=m.radius+1.15;
        const lineOfSight=this.canAttackThroughWorld(m,target);

        if(distance<=attackRange && lineOfSight){
          m.state='attack';
          this.clearNavigation(m);
          if(now>=m.nextAttackAt){
            m.nextAttackAt=now+1600;
            this.combat.monsterAttack(m,target);
          }
        }else{
          m.state='chase';
          this.moveToward(m,target.x,target.z,dt,now,1,attackRange);
        }
      }else{
        // perdeu o alvo: volta para casa antes de voltar a passear
        if(m.targetId!==null){ this.clearNavigation(m); m.returning=true; }
        m.targetId=null;
        const homeDistance=Math.hypot(m.x-m.spawnX,m.z-m.spawnZ);
        const wanderRadius=this.zones[m.zone].radius*.45;

        // Passeio vai até wanderRadius do spawn; só volta para casa depois de perseguir alguém
        // ou se foi parar longe demais (antes voltava a 2 m e cancelava o próprio passeio).
        if(m.returning||homeDistance>wanderRadius+3){
          m.returning=true;
          if(!m.returnStartedAt) m.returnStartedAt=now;
          if(homeDistance<=1.5){
            this.finishReturn(m,now);
          }else if(now-m.returnStartedAt>15000){
            // preso atrás de obstáculo: reaparece no próprio spawn em vez de ficar "andando" parado
            m.x=m.spawnX; m.z=m.spawnZ; this.finishReturn(m,now);
          }else{
            m.state='return';
            this.moveToward(m,m.spawnX,m.spawnZ,dt,now);
          }
        }else if(now>=m.nextThinkAt){
          this.clearNavigation(m);
          m.nextThinkAt=now+1800+this.rng()*3200;
          const a=this.rng()*Math.PI*2,r=this.rng()*wanderRadius;
          m.wanderX=m.spawnX+Math.cos(a)*r;
          m.wanderZ=m.spawnZ+Math.sin(a)*r;
          m.state=this.rng()<.65?'wander':'idle';
        }else if(m.state==='wander'){
          // chegou: fica em idle até o próximo passeio (antes continuava "wander" parado no lugar)
          if(Math.hypot(m.x-m.wanderX,m.z-m.wanderZ)<=.5) m.state='idle';
          else this.moveToward(m,m.wanderX,m.wanderZ,dt,now,.45);
        }else if(m.state!=='idle'){
          m.state='idle';
        }
      }

      if(network) this.emit(m,{t:'monsterMove',id:m.id,x:m.x,z:m.z,state:m.state,targetId:m.targetId,hp:m.hp});
    }

    if(network) this.lastNetworkAt=now;
  }

  moveToward(m,x,z,dt,now,mult=1,approachRange=0){
    if(m.rootUntil>now||m.stunUntil>now)return false;
    const dx=x-m.x,dz=z-m.z,len=Math.hypot(dx,dz)||1;
    const pad=this.navPad(m);
    let vx=dx/len,vz=dz/len,distance=len;
    const direct=!this.navigation || this.navigation.lineClear(m.x,m.z,x,z,pad);

    if(direct){
      if(m.navPath.length) this.clearNavigation(m);
    }else{
      const ok=this.ensureNavigation(m,x,z,now,approachRange);
      if(!ok) return false;
      const route=this.routeDirection(m);
      if(!route){
        m.navReplanAt=0;
        return false;
      }
      vx=route.x;
      vz=route.z;
      distance=route.distance;
    }

    const slow=m.slowUntil>now?.6:1;
    const step=Math.min(distance,m.speed*slow*mult*dt);
    const nx=m.x+vx*step,nz=m.z+vz*step;

    if(this.navigation && !this.navigation.isWalkable(nx,nz,pad)){
      this.clearNavigation(m);
      m.navReplanAt=0;
      return false;
    }

    m.x=nx;
    m.z=nz;
    return true;
  }

  closestPlayer(m,radius){
    let best=null,bestD=radius;
    for(const p of this.players.values()){
      if(p.dead||p.invisible||[4,5,6].includes(p.a)) continue;
      const d=Math.hypot(p.x-m.x,p.z-m.z);
      if(d<bestD){ best=p;bestD=d; }
    }
    return best;
  }
}

module.exports=MonsterManager;
