'use strict';

const SKILLS = require('../data/skills');
const EQUIPMENT = require('../data/equipment');
const { derivePlayer, playerDamage, monsterDamage } = require('./damage-calculator');

class CombatManager {
  constructor({ players, send, now=Date.now, rng=Math.random, awardExperience, onMonsterDeath }) {
    this.players=players; this.send=send; this.now=now; this.rng=rng; this.awardExperience=awardExperience; this.onMonsterDeath=onMonsterDeath;
    this.monsters=null;
  }
  setMonsterManager(manager){ this.monsters=manager; }
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
  refresh(player){ player.stats=derivePlayer(player.dados); player.maxHp=player.stats.maxHp; return player.stats; }
  bonus(player,key){ let total=0; const now=this.now(); for(const [id,b] of player.buffs){if(b.until<=now)player.buffs.delete(id);else total+=b[key]||0;} return total; }
  attack(player,message={}) {
    if (!this.canFight(player)) return this.fail(player,'Você não pode atacar agora.');
    const monster=this.monsters&&this.monsters.get(message.monsterId); if(!monster||monster.dead)return this.fail(player,'Alvo inválido.');
    const stats=this.refresh(player), range=stats.ranged?13:2.4+monster.radius;
    if(Math.hypot(player.x-monster.x,player.z-monster.z)>range)return this.fail(player,'Alvo distante demais.');
    const now=this.now(), interval=1000/stats.attackSpeed;
    if(now-player.lastAttack<interval*0.88)return this.fail(player,'Ataque rápido demais.');
    player.lastAttack=now; return this.hit(player,monster,{multiplier:1,magic:stats.cls==='mago'});
  }
  skill(player,message={}) {
    if (!this.canFight(player)) return this.fail(player,'Você não pode usar habilidade agora.');
    const skill=SKILLS[message.skillId], stats=this.refresh(player);
    if(!skill||skill.cls!==stats.cls||stats.level<skill.req)return this.fail(player,'Habilidade inválida.');
    const now=this.now(), ready=player.cooldowns.get(message.skillId)||0;
    if(now<ready)return this.fail(player,'Habilidade em recarga.');
    if((skill.fp&&player.fp<skill.fp)||(skill.mp&&player.mp<skill.mp))return this.fail(player,'Recurso insuficiente.');
    let target=null;
    if(!['buff','heal'].includes(skill.type)&&!(skill.type==='aoe'&&skill.around==='self')){
      target=this.monsters&&this.monsters.get(message.monsterId);
      if(!target||target.dead)return this.fail(player,'Alvo inválido.');
      const range=(stats.ranged||skill.magic||skill.type==='bolt')?14:skill.around==='self'?skill.radius+1:2.4+target.radius;
      if(Math.hypot(player.x-target.x,player.z-target.z)>range)return this.fail(player,'Alvo distante demais.');
    }
    player.fp-=skill.fp||0; player.mp-=skill.mp||0; player.dados.fp=player.fp; player.dados.mp=player.mp; player.cooldowns.set(message.skillId,now+skill.cooldown*1000); player.dirty=true;
    if(skill.type==='buff'){player.buffs.set(skill.buff.id,{...skill.buff,until:now+skill.buff.seconds*1000});this.sync(player);return true;}
    if(skill.type==='heal'){const got=Math.min(Math.round(20+stats.int*2.2+stats.level*3),stats.maxHp-player.hp);player.hp+=got;player.dados.hp=player.hp;this.sync(player,{heal:got});this.syncPartyHp(player);return true;}
    const options={multiplier:skill.multiplier,magic:skill.magic,stat:skill.stat,critAdd:skill.critAdd};
    if(skill.type==='aoe'){
      const center=skill.around==='self'?player:target; let result=false;
      for(const m of this.monsters.near(center.x,center.z,skill.radius+1)) if(!m.dead) result=this.hit(player,m,options)||result;
      return result;
    }
    if(skill.type==='double'){const one=this.hit(player,target,options);if(!target.dead)this.hit(player,target,options);return one;}
    if(skill.slow)target.slowUntil=now+skill.slow*1000;
    return this.hit(player,target,options);
  }
  hit(player,monster,options){
    const result=playerDamage(player.stats||this.refresh(player),monster,{...options,attackBonus:this.bonus(player,'atk'),critBonus:this.bonus(player,'crit')},this.rng);
    if(!result.miss){monster.hp=Math.max(0,monster.hp-result.damage);monster.targetId=player.id;monster.state='chase';}
    this.monsters.emit(monster,{t:'combatHit',sourceId:player.id,monsterId:monster.id,...result,hp:monster.hp,maxHp:monster.maxHp});
    if(monster.hp<=0&&!monster.dead){monster.dead=true;monster.state='dead';monster.deathAt=this.now();this.awardExperience(player,monster);this.onMonsterDeath(monster,player);this.monsters.emit(monster,{t:'monsterDeath',id:monster.id,killerId:player.id,respawnAt:monster.deathAt+(monster.giant?45000:9000)});}
    return true;
  }
  monsterAttack(monster,player){
    if(player.dead)return false; const stats=this.refresh(player); const result=monsterDamage(monster,stats,{defenseBonus:this.bonus(player,'def')},this.rng);
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
    const inv=Array.isArray(player.dados.inv)?player.dados.inv:[],eq=player.dados.eq||(player.dados.eq={}),upgrades=player.dados.equp||(player.dados.equp={});
    if(message.action==='unequip'){
      const slot=message.slot,id=eq[slot];if(!id||!EQUIPMENT[id])return this.fail(player,'Equipamento inválido.');if(inv.length>=24)return this.fail(player,'Mochila cheia.');
      inv.push(upgrades[slot]?{id,n:1,up:upgrades[slot]}:{id,n:1});eq[slot]=null;upgrades[slot]=0;
    }else{
      const index=Number(message.index),entry=inv[index],item=entry&&EQUIPMENT[entry.id],stats=this.refresh(player);if(!item||item.req>stats.level||(item.cls&&item.cls!==stats.cls))return this.fail(player,'Você não pode equipar este item.');
      inv.splice(index,1);const old=eq[item.slot];if(old)inv.push(upgrades[item.slot]?{id:old,n:1,up:upgrades[item.slot]}:{id:old,n:1});eq[item.slot]=entry.id;upgrades[item.slot]=entry.up||0;
    }
    player.dirty=true;this.refresh(player);this.send(player.ws,{t:'equipmentState',inv,eq,equp:upgrades,combat:{hp:player.hp,maxHp:player.stats.maxHp,mp:player.mp,maxMp:player.stats.maxMp,fp:player.fp,maxFp:player.stats.maxFp}});return true;
  }
  addAttribute(player,message={}){const key=message.stat;if(!['str','sta','dex','int'].includes(key)||Math.floor(player.dados.pts||0)<1)return this.fail(player,'Ponto de atributo inválido.');player.dados[key]=Math.floor(player.dados[key]||15)+1;player.dados.pts--;player.dirty=true;this.refresh(player);this.send(player.ws,{t:'attributeState',stat:key,value:player.dados[key],pts:player.dados.pts});return true;}
  resetPlayer(player){player.dados={L:1,exp:0,str:15,sta:15,dex:15,int:15,pts:0,gold:0,cls:'aprendiz',quest:null,inv:[{id:'pocao_vida',n:5},{id:'pocao_energia',n:3}],eq:{arma:'espada_treino',capacete:null,peitoral:null,botas:null,voo:null},equp:{}};player.L=1;player.x=0;player.z=5;this.initializePlayer(player);player.dirty=player.posDirty=true;this.send(player.ws,{t:'resetState',dados:player.dados});return true;}
  changeClass(player,message={}){
    const rules={guerreiro:{item:'presa',n:6,weapon:'espada_soldado'},druida:{item:'chapeu',n:8,weapon:'cajado_carvalho'},mago:{item:'gosma',n:12,weapon:'varinha_arcana'},arqueiro:{item:'pelo',n:10,weapon:'arco_curto'}},rule=rules[message.cls];
    if(!rule||player.dados.cls!=='aprendiz'||player.L<15)return this.fail(player,'Troca de classe inválida.');const inv=player.dados.inv||[],mat=inv.find(x=>x&&x.id===rule.item&&x.n>=rule.n);if(!mat)return this.fail(player,'Materiais insuficientes.');
    mat.n-=rule.n;if(mat.n<=0)inv.splice(inv.indexOf(mat),1);player.dados.cls=message.cls;player.dados.quest=null;for(const key of ['str','sta','dex','int'])player.dados[key]=15;player.dados.pts=2*(player.L-1);const old=player.dados.eq.arma,oldUp=player.dados.equp.arma||0;player.dados.eq.arma=rule.weapon;player.dados.equp.arma=0;if(old)inv.push(oldUp?{id:old,n:1,up:oldUp}:{id:old,n:1});player.dirty=true;this.refresh(player);player.hp=player.stats.maxHp;player.mp=player.stats.maxMp;player.fp=player.stats.maxFp;Object.assign(player.dados,{hp:player.hp,mp:player.mp,fp:player.fp});this.send(player.ws,{t:'classState',dados:player.dados,combat:{hp:player.hp,mp:player.mp,fp:player.fp}});return true;
  }
  tick(dt){for(const p of this.players.values()){if(p.dead)continue;const s=this.refresh(p);const before=[p.hp,p.mp,p.fp];if(this.now()-(p.lastDamagedAt||0)>5000){p.hp=Math.min(s.maxHp,p.hp+s.maxHp*.025*dt);p.mp=Math.min(s.maxMp,p.mp+s.maxMp*.05*dt);p.fp=Math.min(s.maxFp,p.fp+s.maxFp*.05*dt);}if(this.bonus(p,'regen'))p.hp=Math.min(s.maxHp,p.hp+s.maxHp*.02*dt);if(before.some((v,i)=>Math.floor(v)!==Math.floor([p.hp,p.mp,p.fp][i]))){Object.assign(p.dados,{hp:p.hp,mp:p.mp,fp:p.fp});p.dirty=true;}}}
  respawn(player,x,z){if(!player.dead)return false;const loss=Math.round((28*Math.pow(player.L,1.65)+22)*.03);player.dados.exp=Math.max(0,Math.floor(player.dados.exp||0)-loss);player.dead=false;player.x=x;player.z=z;const s=this.refresh(player);player.hp=s.maxHp;player.fp=s.maxFp;player.mp=s.maxMp;Object.assign(player.dados,{hp:player.hp,fp:player.fp,mp:player.mp});player.dirty=player.posDirty=true;this.sync(player,{exp:player.dados.exp,expLoss:loss});return true;}
  sync(player,extra={}){this.send(player.ws,{t:'combatState',hp:player.hp,maxHp:player.stats.maxHp,mp:player.mp,maxMp:player.stats.maxMp,fp:player.fp,maxFp:player.stats.maxFp,...extra});}
  syncPartyHp(player){if(!player.party)return;for(const id of player.party.members){const member=this.players.get(id);if(member&&member!==player)this.send(member.ws,{t:'php',id:player.id,hp:player.hp,max:player.stats.maxHp});}}
  canFight(player){return !player.dead&&!player.shop&&![4,5,6].includes(player.a);}
  fail(player,msg){this.send(player.ws,{t:'combatReject',msg});return false;}
}

module.exports = CombatManager;
