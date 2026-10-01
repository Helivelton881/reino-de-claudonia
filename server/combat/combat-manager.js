'use strict';

const SKILLS = require('../data/skills');
const EQUIPMENT = require('../data/equipment');
const { derivePlayer, playerDamage, monsterDamage } = require('./damage-calculator');

class CombatManager {
  constructor({ players, send, now=Date.now, rng=Math.random, awardExperience, onMonsterDeath }) {
    this.players=players; this.send=send; this.now=now; this.rng=rng; this.awardExperience=awardExperience; this.onMonsterDeath=onMonsterDeath;
    this.monsters=null; this.skillManager=null; this.itemManager=null;
  }
  setMonsterManager(manager){ this.monsters=manager; }
  setSkillManager(manager){ this.skillManager=manager; }
  setItemManager(manager){ this.itemManager=manager; }
  initializePlayer(player){
    const s=derivePlayer(player.dados); player.stats=s;
    for(const key of ['hp','mp','fp']) {
      const max=s[`max${key[0].toUpperCase()+key.slice(1)}`];
      const raw=player.dados[key], saved=raw===null||raw===undefined||raw===''?NaN:Number(raw); player[key]=Number.isFinite(saved)?Math.max(0,Math.min(max,Math.round(saved))):max; player.dados[key]=player[key];
    }
    // quem saiu do jogo morto volta vivo (como no Flyff): entrar com vida zero = vida cheia
    if(player.hp<=0){player.hp=s.maxHp;player.dados.hp=player.hp;}
    player.maxHp=s.maxHp; player.cooldowns=new Map(); player.buffs=new Map(); player.dead=player.hp<=0; player.lastAttack=0;
  }
  refresh(player){
    const s=derivePlayer(player.dados),b=this.skillManager?this.skillManager.statBonuses(player):{};
    const atk=(b.atk||0)+(s.cls==='mago'?(b.magicAtk||0):0);
    s.atkMin*=1+atk;s.atkMax*=1+atk;s.defense*=1+(b.def||0);
    s.maxHp=Math.round(s.maxHp*(1+(b.hp||0)));s.maxMp=Math.round(s.maxMp*(1+(b.mp||0)));s.maxFp=Math.round(s.maxFp*(1+(b.fp||0)));
    s.crit=Math.min(.95,s.crit+(b.crit||0));s.attackSpeed*=1+(b.attackSpeed||0);s.rangeBonus=b.range||0;s.healingBonus=b.healing||0;s.dotBonus=b.dot||0;s.partyDamage=b.partyDamage||0;
    player.stats=s;player.maxHp=s.maxHp;return s;
  }
  bonus(player,key){ let total=0; const now=this.now(); for(const [id,b] of player.buffs){if(b.until<=now)player.buffs.delete(id);else total+=b[key]||0;} return total; }
  partyTargets(player,radius=25){
    if(!player.party)return[player];
    return [...player.party.members].map(id=>this.players.get(id)).filter(p=>p&&!p.dead&&Math.hypot(p.x-player.x,p.z-player.z)<=radius);
  }
  partyAuraBonus(player,key){
    if(!player.party||!this.skillManager)return 0;let total=0;
    for(const p of this.partyTargets(player,25)){const b=this.skillManager.statBonuses(p);if(p!==player)total+=Number(b[key]||0);}
    return total;
  }
  monsterEffects(monster){
    const now=this.now();monster.effects=monster.effects||{};
    for(const [id,e] of Object.entries(monster.effects))if(!e||e.until<=now)delete monster.effects[id];
    return Object.values(monster.effects);
  }
  monsterEffectBonus(monster,key){return this.monsterEffects(monster).reduce((n,e)=>n+Number(e[key]||0),0);}
  applyDebuff(player,monster,skill){
    const data=skill.debuff||{};monster.effects=monster.effects||{};monster.effects[data.id||skill.id]={...data,type:'debuff',sourceId:player.id,until:this.now()+Math.max(.5,Number(data.seconds)||1)*1000};
    if(data.slow)monster.slowUntil=Math.max(monster.slowUntil||0,this.now()+data.seconds*1000);
    if(data.taunt){monster.targetId=player.id;monster.tauntUntil=this.now()+data.seconds*1000;}
    this.monsters.emit(monster,{t:'monsterStatus',id:monster.id,status:data.id||skill.id,kind:'debuff',seconds:data.seconds||1});
  }
  applyCc(player,monster,skill){
    const data=skill.cc||{},until=this.now()+Math.max(.3,Number(data.seconds)||1)*1000;
    if(data.kind==='stun')monster.stunUntil=Math.max(monster.stunUntil||0,until);
    if(data.kind==='root')monster.rootUntil=Math.max(monster.rootUntil||0,until);
    monster.effects=monster.effects||{};monster.effects[data.id||skill.id]={...data,type:'cc',sourceId:player.id,until};
    this.monsters.emit(monster,{t:'monsterStatus',id:monster.id,status:data.id||skill.id,kind:data.kind||'cc',seconds:data.seconds||1});
  }
  applyDot(player,monster,skill){
    const data=skill.dot||{},now=this.now(),interval=Math.max(.5,Number(data.interval)||2)*1000;
    monster.effects=monster.effects||{};monster.effects[data.id||skill.id]={...data,type:'dot',sourceId:player.id,skillId:skill.id,magic:!!skill.magic,stat:skill.stat||null,until:now+Math.max(1,Number(data.seconds)||4)*1000,nextTick:now+interval,interval};
    this.monsters.emit(monster,{t:'monsterStatus',id:monster.id,status:data.id||skill.id,kind:'dot',seconds:data.seconds||4});
  }
  tickMonsterEffects(){
    if(!this.monsters||!this.monsters.monsters)return;const now=this.now();
    for(const monster of this.monsters.monsters.values()){
      if(monster.dead)continue;
      for(const e of this.monsterEffects(monster)){
        if(e.type!=='dot'||now<e.nextTick)continue;const owner=this.players.get(e.sourceId);if(!owner||owner.dead){delete monster.effects[e.id||e.skillId];continue;}
        e.nextTick=now+e.interval;const stats=this.refresh(owner),mult=Number(e.multiplier||.25)*(1+(stats.dotBonus||0));this.hit(owner,monster,{multiplier:mult,magic:e.magic,stat:e.stat,dot:true});
      }
    }
  }
  attack(player,message={}) {
    if (!this.canFight(player)) return this.fail(player,'Você não pode atacar agora.');
    const monster=this.monsters&&this.monsters.get(message.monsterId); if(!monster||monster.dead)return this.fail(player,'Alvo inválido.');
    const stats=this.refresh(player), range=(stats.ranged?13:2.4+monster.radius)+(stats.rangeBonus||0);
    if(Math.hypot(player.x-monster.x,player.z-monster.z)>range)return this.fail(player,'Alvo distante demais.');
    const now=this.now(), interval=1000/stats.attackSpeed;
    if(now-player.lastAttack<interval*0.88)return this.fail(player,'Ataque rápido demais.');
    player.lastAttack=now; return this.hit(player,monster,{multiplier:1,magic:stats.cls==='mago'});
  }
  skill(player,message={}) {
    if (!this.canFight(player)) return this.fail(player,'Você não pode usar habilidade agora.');
    const raw=SKILLS[message.skillId],stats=this.refresh(player);
    const skill=this.skillManager?this.skillManager.resolved(player,message.skillId):(raw&&raw.cls===stats.cls&&stats.level>=raw.req?{...raw,...(raw.ranks&&raw.ranks[0]||{}),rank:1}:null);
    if(!skill)return this.fail(player,'Habilidade inválida ou não aprendida.');
    const now=this.now(),ready=player.cooldowns.get(message.skillId)||0;
    if(now<ready)return this.fail(player,'Habilidade em recarga.');
    if((skill.fp&&player.fp<skill.fp)||(skill.mp&&player.mp<skill.mp))return this.fail(player,'Recurso insuficiente.');
    const selfTypes=new Set(['buff','heal','party-buff','party-heal']);
    let target=null;
    if(!selfTypes.has(skill.type)&&!(skill.type==='aoe'&&skill.around==='self')){
      target=this.monsters&&this.monsters.get(message.monsterId);
      if(!target||target.dead)return this.fail(player,'Alvo inválido.');
      const range=Math.max(0.5,Number(skill.range)||2.4)+target.radius+(stats.rangeBonus||0);
      if(Math.hypot(player.x-target.x,player.z-target.z)>range)return this.fail(player,'Alvo distante demais.');
    }
    player.fp-=skill.fp||0;player.mp-=skill.mp||0;player.dados.fp=player.fp;player.dados.mp=player.mp;player.cooldowns.set(message.skillId,now+Math.max(0,skill.cooldown||0)*1000);player.dirty=true;

    const effect=(kind,extra={})=>this.send(player.ws,{t:'skillEffect',skillId:skill.id,rank:skill.rank,kind,...extra});
    if(skill.type==='buff'){
      player.buffs.set(skill.buff.id,{...skill.buff,sourceId:player.id,until:now+skill.buff.seconds*1000});this.sync(player,{skillId:skill.id,skillRank:skill.rank});effect('buff');return true;
    }
    if(skill.type==='party-buff'){
      const targets=this.partyTargets(player,25);
      for(const member of targets){member.buffs.set(skill.buff.id,{...skill.buff,sourceId:player.id,until:now+skill.buff.seconds*1000});member.dirty=true;this.sync(member,{skillId:skill.id,skillRank:skill.rank});}
      effect('party-buff',{targets:targets.map(x=>x.id)});return true;
    }
    if(skill.type==='heal'){
      const power=(Number(skill.healPower)||1)*(1+(stats.healingBonus||0)),got=Math.min(Math.round((20+stats.int*2.2+stats.level*3)*power),stats.maxHp-player.hp);
      player.hp+=got;player.dados.hp=player.hp;player.dirty=true;this.sync(player,{heal:got,skillRank:skill.rank});this.syncPartyHp(player);effect('heal',{heal:got});return true;
    }
    if(skill.type==='party-heal'){
      const power=(Number(skill.healPower)||1)*(1+(stats.healingBonus||0)),targets=this.partyTargets(player,25);
      for(const member of targets){const ms=this.refresh(member),got=Math.min(Math.round((20+stats.int*2.2+stats.level*3)*power),ms.maxHp-member.hp);member.hp+=got;member.dados.hp=member.hp;member.dirty=true;this.sync(member,{heal:got,skillId:skill.id,skillRank:skill.rank});this.syncPartyHp(member);}
      effect('party-heal',{targets:targets.map(x=>x.id)});return true;
    }
    if(skill.type==='debuff'){this.applyDebuff(player,target,skill);effect('debuff',{monsterId:target.id});return true;}
    if(skill.type==='taunt'){this.applyDebuff(player,target,skill);effect('taunt',{monsterId:target.id});return true;}
    if(skill.type==='cc'){this.applyCc(player,target,skill);effect('cc',{monsterId:target.id});return true;}
    if(skill.type==='dot'){this.applyDot(player,target,skill);effect('dot',{monsterId:target.id});return true;}

    const options={multiplier:skill.multiplier,magic:skill.magic,stat:skill.stat,critAdd:skill.critAdd};
    if(skill.type==='aoe'){
      const center=skill.around==='self'?player:target;let result=false;
      for(const m of this.monsters.near(center.x,center.z,(skill.radius||1)+1))if(!m.dead)result=this.hit(player,m,options)||result;
      effect('aoe',{monsterId:target&&target.id||null});return result;
    }
    if(skill.type==='double'){const one=this.hit(player,target,options);if(!target.dead)this.hit(player,target,options);effect('double',{monsterId:target.id});return one;}
    if(skill.slow)target.slowUntil=Math.max(target.slowUntil||0,now+skill.slow*1000);
    const ok=this.hit(player,target,options);effect('hit',{monsterId:target.id});return ok;
  }
  hit(player,monster,options={}){
    const stats=player.stats||this.refresh(player),armorDown=Math.min(.7,this.monsterEffectBonus(monster,'armorDown')),vuln=Math.min(.8,this.monsterEffectBonus(monster,'vuln'));
    const effectiveMonster={...monster,defense:monster.defense*(1-armorDown)};
    const attackBonus=this.bonus(player,'atk')+vuln+this.partyAuraBonus(player,'partyDamage');
    const result=playerDamage(stats,effectiveMonster,{...options,attackBonus,critBonus:this.bonus(player,'crit')},this.rng);
    if(!result.miss){
      monster.hp=Math.max(0,monster.hp-result.damage);
      if(this.monsters&&typeof this.monsters.recordContribution==='function')this.monsters.recordContribution(monster,player.id,result.damage);
      if(!(monster.tauntUntil>this.now())||monster.targetId===player.id)monster.targetId=player.id;
      monster.state='chase';
    }
    this.monsters.emit(monster,{t:'combatHit',sourceId:player.id,monsterId:monster.id,...result,hp:monster.hp,maxHp:monster.maxHp,dot:!!options.dot});
    if(monster.hp<=0&&!monster.dead){
      monster.dead=true;monster.state='dead';monster.deathAt=this.now();monster.effects={};
      this.awardExperience(player,monster);this.onMonsterDeath(monster,player);
      this.monsters.emit(monster,{t:'monsterDeath',id:monster.id,killerId:player.id,respawnAt:monster.deathAt+(monster.respawnMs||(monster.giant?300000:9000))});
    }
    return true;
  }
  monsterAttack(monster,player){
    if(player.dead||monster.stunUntil>this.now())return false;
    const stats=this.refresh(player),attackDown=Math.min(.75,this.monsterEffectBonus(monster,'attackDown')),effectiveMonster={...monster,attack:monster.attack*(1-attackDown)};
    const result=monsterDamage(effectiveMonster,stats,{defenseBonus:this.bonus(player,'def')},this.rng);
    if(!result.dodged){player.hp=Math.max(0,player.hp-result.damage);player.lastDamagedAt=this.now();player.dados.hp=player.hp;player.dirty=true;}
    this.send(player.ws,{t:'playerHit',monsterId:monster.id,...result,hp:player.hp,maxHp:stats.maxHp});
    this.syncPartyHp(player);
    if(player.hp<=0){player.dead=true;this.send(player.ws,{t:'playerDeath'});}
    return true;
  }
  useItem(player,message={}){
    const amounts={pocao_vida:['hp',80],pocao_mana:['mp',50],pocao_energia:['fp',40]},rule=amounts[message.itemId];if(!rule&&message.itemId!=='combustivel')return this.fail(player,'Item inválido.');
    const now=this.now();if(now<(player.nextItemAt||0))return this.fail(player,'Item em recarga.');
    const inv=Array.isArray(player.dados.inv)?player.dados.inv:[],slot=inv.find(x=>x&&x.id===message.itemId&&x.n>0);if(!slot)return this.fail(player,'Você não possui este item.');
    if(message.itemId==='combustivel'){slot.n--;if(slot.n<=0)inv.splice(inv.indexOf(slot),1);player.nextItemAt=now+1000;player.dirty=true;this.send(player.ws,{t:'itemEffect',itemId:message.itemId,inv});return true;}
    const stats=this.refresh(player),key=rule[0],max=stats[`max${key[0].toUpperCase()+key.slice(1)}`];if(player[key]>=max)return this.fail(player,'O recurso já está cheio.');
    slot.n--;if(slot.n<=0)inv.splice(inv.indexOf(slot),1);player[key]=Math.min(max,player[key]+rule[1]);player.dados[key]=player[key];player.nextItemAt=now+1000;player.dirty=true;this.sync(player,{inv});return true;
  }
  equipment(player,message={}){
    if(!this.itemManager)return this.fail(player,'Sistema de itens indisponível.');
    const ok=message.action==='unequip'?this.itemManager.unequip(player,message.slot):this.itemManager.equip(player,message.index);
    if(!ok)return false;
    const st=this.refresh(player);player.hp=Math.min(player.hp,st.maxHp);player.mp=Math.min(player.mp,st.maxMp);player.fp=Math.min(player.fp,st.maxFp);Object.assign(player.dados,{hp:player.hp,mp:player.mp,fp:player.fp});
    this.send(player.ws,{t:'equipmentState',...this.itemManager.snapshot(player),combat:{hp:player.hp,maxHp:st.maxHp,mp:player.mp,maxMp:st.maxMp,fp:player.fp,maxFp:st.maxFp}});return true;
  }
  addAttribute(player,message={}){const key=message.stat;if(!['str','sta','dex','int'].includes(key)||Math.floor(player.dados.pts||0)<1)return this.fail(player,'Ponto de atributo inválido.');player.dados[key]=Math.floor(player.dados[key]||15)+1;player.dados.pts--;player.dirty=true;this.refresh(player);this.send(player.ws,{t:'attributeState',stat:key,value:player.dados[key],pts:player.dados.pts});return true;}
  resetPlayer(player){player.dados={L:1,exp:0,str:15,sta:15,dex:15,int:15,pts:0,gold:0,cls:'aprendiz',quest:null,quests:{active:{},completed:[]},skillTree:{version:2,ranks:{},legacyUnlocks:[],specialization:null,respecs:0},inv:[{id:'pocao_vida',n:5},{id:'pocao_energia',n:3}],storage:[],itemSeq:0,eq:{arma:'espada_treino',offhand:null,capacete:null,peitoral:null,luvas:null,botas:null,capa:null,acessorio1:null,acessorio2:null,voo:null},equp:{},eqMeta:{}};player.L=1;player.x=0;player.z=5;if(this.itemManager)this.itemManager.ensurePlayer(player);this.initializePlayer(player);player.dirty=player.posDirty=true;this.send(player.ws,{t:'resetState',dados:player.dados});if(this.skillManager)this.skillManager.sync(player,{event:'reset'});if(this.itemManager)this.itemManager.sync(player,{event:'reset'});return true;}
  changeClassFromQuest(player,cls){
    const rules={guerreiro:{item:'presa',n:6,weapon:'espada_soldado'},druida:{item:'chapeu',n:8,weapon:'cajado_carvalho'},mago:{item:'gosma',n:12,weapon:'varinha_arcana'},arqueiro:{item:'pelo',n:10,weapon:'arco_curto'}},rule=rules[cls];
    if(!rule||player.dados.cls!=='aprendiz'||player.L<15)return this.fail(player,'Troca de classe inválida.');const inv=player.dados.inv||[],mat=inv.find(x=>x&&x.id===rule.item&&x.n>=rule.n);if(!mat)return this.fail(player,'Materiais insuficientes.');
    mat.n-=rule.n;if(mat.n<=0)inv.splice(inv.indexOf(mat),1);const oldEntry=this.itemManager?this.itemManager.equippedEntry(player,'arma'):null;player.dados.cls=cls;for(const key of ['str','sta','dex','int'])player.dados[key]=15;player.dados.pts=2*(player.L-1);if(oldEntry)inv.push(oldEntry);player.dados.eq.arma=rule.weapon;player.dados.equp.arma=0;if(this.itemManager){const item=EQUIPMENT[rule.weapon];player.dados.eqMeta.arma=this.itemManager.normalizeMeta(item,{uid:this.itemManager.nextUid(player,rule.weapon)});}player.dirty=true;this.refresh(player);player.hp=player.stats.maxHp;player.mp=player.stats.maxMp;player.fp=player.stats.maxFp;Object.assign(player.dados,{hp:player.hp,mp:player.mp,fp:player.fp});this.send(player.ws,{t:'classState',dados:player.dados,combat:{hp:player.hp,mp:player.mp,fp:player.fp}});return true;
  }
  tick(dt){this.tickMonsterEffects();for(const p of this.players.values()){if(p.dead)continue;const s=this.refresh(p);const before=[p.hp,p.mp,p.fp];if(this.now()-(p.lastDamagedAt||0)>5000){p.hp=Math.min(s.maxHp,p.hp+s.maxHp*.025*dt);p.mp=Math.min(s.maxMp,p.mp+s.maxMp*.05*dt);p.fp=Math.min(s.maxFp,p.fp+s.maxFp*.05*dt);}if(this.bonus(p,'regen'))p.hp=Math.min(s.maxHp,p.hp+s.maxHp*.02*dt);if(before.some((v,i)=>Math.floor(v)!==Math.floor([p.hp,p.mp,p.fp][i]))){Object.assign(p.dados,{hp:p.hp,mp:p.mp,fp:p.fp});p.dirty=true;}}}
  respawn(player,x,z){if(!player.dead)return false;const loss=Math.round((28*Math.pow(player.L,1.65)+22)*.03);player.dados.exp=Math.max(0,Math.floor(player.dados.exp||0)-loss);player.dead=false;player.x=x;player.z=z;const s=this.refresh(player);player.hp=s.maxHp;player.fp=s.maxFp;player.mp=s.maxMp;Object.assign(player.dados,{hp:player.hp,fp:player.fp,mp:player.mp});player.dirty=player.posDirty=true;this.sync(player,{exp:player.dados.exp,expLoss:loss});return true;}
  sync(player,extra={}){this.send(player.ws,{t:'combatState',hp:player.hp,maxHp:player.stats.maxHp,mp:player.mp,maxMp:player.stats.maxMp,fp:player.fp,maxFp:player.stats.maxFp,...extra});}
  syncPartyHp(player){if(!player.party)return;for(const id of player.party.members){const member=this.players.get(id);if(member&&member!==player)this.send(member.ws,{t:'php',id:player.id,hp:player.hp,max:player.stats.maxHp});}}
  canFight(player){return !player.dead&&!player.shop&&![4,5,6].includes(player.a);}
  fail(player,msg){this.send(player.ws,{t:'combatReject',msg});return false;}
}

module.exports = CombatManager;
