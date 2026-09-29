'use strict';

const EQUIPMENT=require('../data/equipment');

const PLAYER_PAD=0.45;
const FLIGHT_RADIUS=330;
const SPAWN={x:0,z:5};

function flightEquipment(player){
  const id=player&&player.dados&&player.dados.eq&&player.dados.eq.voo;
  const item=id&&EQUIPMENT[id];
  if(!item||item.slot!=='voo')return null;
  const level=Number(player.L)||1;
  if(level<Math.max(20,item.req||20))return null;
  return {id,item};
}

function sanitizeAction(player,requested){
  let action=[0,1,2,3,4,5,6].includes(requested)?requested:0;
  if(action===6&&!player.shop)action=0;
  if(action===4||action===5){
    const flight=flightEquipment(player);
    if(!flight)return 0;
    action=flight.id.startsWith('vassoura_')?5:4;
  }
  return action;
}

function reject(action,reason){
  return {ok:false,action,reason};
}

function validateMovement({navigation,player,to,requestedAction,elapsed,now=Date.now()}){
  const action=sanitizeAction(player,requestedAction);
  const flying=action===4||action===5;
  const wasFlying=player.a===4||player.a===5;
  const falling=!!player.fallingFromFlight||wasFlying&&!flying;
  const dt=Math.max(0.05,Math.min(2,Number(elapsed)||0.05));

  if(player.dead&&Math.hypot(to.x-player.x,to.z-player.z)>0.05)return reject(action,'dead');

  // Queda no vazio usa o respawn local conhecido do jogo.
  if(!flying&&falling&&player.y<-28&&Math.hypot(to.x-SPAWN.x,to.z-SPAWN.z)<1.5){
    const s=navigation.playerSurfaceAt(SPAWN.x,SPAWN.z);
    if(s&&Math.abs(to.y-s.h)<3)return {ok:true,action:0,fallingFromFlight:false,fallRespawn:true};
  }

  const distance=Math.hypot(to.x-player.x,to.z-player.z);
  const speedLimit=flying?38:12, horizontalSlack=flying?1.2:0.6;
  if(distance>speedLimit*dt+horizontalSlack)return reject(action,'speed');

  const dy=Math.abs(to.y-player.y);
  const verticalRate=falling&&!flying?80:(flying?12:20);
  const verticalSlack=falling&&!flying?1.0:0.8;
  if(dy>verticalRate*dt+verticalSlack)return reject(action,'vertical-speed');

  if(flying){
    if(!wasFlying){
      if(player.dead||player.shop)return reject(action,'flight-state');
      if(Math.hypot(player.x,player.z)<10)return reject(action,'takeoff-zone');
      if(now-(player.lastDamagedAt||0)<3000)return reject(action,'combat-takeoff');
    }
    if(Math.hypot(to.x,to.z)>FLIGHT_RADIUS+2||to.y<-26||to.y>76)return reject(action,'flight-bounds');
    return {ok:true,action,fallingFromFlight:false};
  }

  const surface=navigation.playerSurfaceAt(to.x,to.z);
  if(falling){
    if(to.y>player.y+0.3)return reject(action,'fall-ascent');
    if(!surface){
      if(Math.hypot(to.x,to.z)>FLIGHT_RADIUS+2||to.y<-35)return reject(action,'fall-bounds');
      return {ok:true,action,fallingFromFlight:true};
    }
    if(to.y>surface.h+3.2)return {ok:true,action,fallingFromFlight:true};
    if(!navigation.isPlayerWalkable(to.x,to.z,PLAYER_PAD))return reject(action,'blocked-destination');
    return {ok:true,action,fallingFromFlight:false};
  }

  if(!surface||!navigation.isPlayerWalkable(to.x,to.z,PLAYER_PAD))return reject(action,'blocked-destination');
  if(!navigation.playerLineClear(player.x,player.z,to.x,to.z,PLAYER_PAD))return reject(action,'blocked-path');

  const tolerance=surface.kind==='island'?3.2:2.8;
  if(to.y<surface.h-1.5||to.y>surface.h+tolerance)return reject(action,'ground-height');

  return {ok:true,action,fallingFromFlight:false};
}

function sanitizeSavedPosition(navigation,x,z){
  const sx=Number.isFinite(x)?x:SPAWN.x, sz=Number.isFinite(z)?z:SPAWN.z;
  const found=navigation.nearestPlayerWalkable(sx,sz,PLAYER_PAD,12);
  if(found)return {x:found.x,z:found.z,corrected:Math.hypot(found.x-sx,found.z-sz)>0.01};
  const spawn=navigation.nearestPlayerWalkable(SPAWN.x,SPAWN.z,PLAYER_PAD,12)||SPAWN;
  return {x:spawn.x,z:spawn.z,corrected:true};
}

module.exports={PLAYER_PAD,FLIGHT_RADIUS,SPAWN,flightEquipment,sanitizeAction,validateMovement,sanitizeSavedPosition};
