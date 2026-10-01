'use strict';
const PETS=Object.freeze({
 lumim:Object.freeze({id:'lumim',name:'Lumim',role:'Coletor',pickupRadius:6,tiers:[{tier:1,name:'Lumim Jovem',level:1,model:'lumim_t1.glb',bonus:{pickup:1}},{tier:2,name:'Lumim Radiante',level:10,model:'lumim_t2.glb',bonus:{pickup:1,goldPct:.01}},{tier:3,name:'Lumim Astral',level:25,model:'lumim_t3.glb',bonus:{pickup:1,goldPct:.02}}]}),
 pedral:Object.freeze({id:'pedral',name:'Pedral',role:'Guardião',pickupRadius:5,tiers:[{tier:1,name:'Pedral Filhote',level:1,model:'pedral_t1.glb',bonus:{sta:1}},{tier:2,name:'Pedral Rúnico',level:10,model:'pedral_t2.glb',bonus:{sta:2}},{tier:3,name:'Pedral Ancião',level:25,model:'pedral_t3.glb',bonus:{sta:3}}]}),
 ventisco:Object.freeze({id:'ventisco',name:'Ventisco',role:'Companheiro',pickupRadius:5.5,tiers:[{tier:1,name:'Ventisco Jovem',level:1,model:'ventisco_t1.glb',bonus:{speedPct:.005}},{tier:2,name:'Ventisco Alado',level:10,model:'ventisco_t2.glb',bonus:{speedPct:.01}},{tier:3,name:'Ventisco Celeste',level:25,model:'ventisco_t3.glb',bonus:{speedPct:.015}}]})
});
module.exports={PETS};
