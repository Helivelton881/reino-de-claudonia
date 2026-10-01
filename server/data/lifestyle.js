'use strict';

// Fase 15: profissões de coleta e criação (data-driven).
// Coleta: Mineração, Lenhador, Herbalismo e Pesca (linhas independentes).
// Criação: Forja, Marcenaria, Alquimia e Culinária, cada uma numa estação da vila.
// O cliente só recebe este catálogo e envia intenções; tudo é validado no servidor.

const {ZONES}=require('./monsters');
const {LAKE,OPEN_HALLS}=require('../../public/js/world-collision-map');

const MAX_PROF_LEVEL=50;
const xpNeed=level=>Math.round(25*Math.pow(Math.max(1,level),1.4)+25);

const PROFESSIONS=Object.freeze({
  mineracao:Object.freeze({id:'mineracao',name:'Mineração',kind:'gather',icon:'⛏️',toolName:'Picareta'}),
  lenhador:Object.freeze({id:'lenhador',name:'Lenhador',kind:'gather',icon:'🪓',toolName:'Machado de lenha'}),
  herbalismo:Object.freeze({id:'herbalismo',name:'Herbalismo',kind:'gather',icon:'🌿',toolName:'Foice'}),
  pesca:Object.freeze({id:'pesca',name:'Pesca',kind:'gather',icon:'🎣',toolName:'Vara de pesca'}),
  forja:Object.freeze({id:'forja',name:'Forja',kind:'craft',icon:'⚒️',station:'forja'}),
  marcenaria:Object.freeze({id:'marcenaria',name:'Marcenaria',kind:'craft',icon:'🪚',station:'marcenaria'}),
  alquimia:Object.freeze({id:'alquimia',name:'Alquimia',kind:'craft',icon:'⚗️',station:'alquimia'}),
  culinaria:Object.freeze({id:'culinaria',name:'Culinária',kind:'craft',icon:'🍲',station:'culinaria'})
});

// Estações reaproveitam as construções abertas da vila (index.html: OPEN_HALLS = taverna, forja, alquimista, estalagem).
const [HALL_TAVERNA,HALL_FORJA,HALL_ALQUIMIA]=OPEN_HALLS;
const STATIONS=Object.freeze({
  forja:Object.freeze({id:'forja',name:'Bigorna da Forja',x:HALL_FORJA[0],z:HALL_FORJA[1],radius:7,model:'Anvil'}),
  marcenaria:Object.freeze({id:'marcenaria',name:'Bancada de Marcenaria',x:HALL_FORJA[0],z:HALL_FORJA[1],radius:7,model:'Workbench'}),
  alquimia:Object.freeze({id:'alquimia',name:'Caldeirão do Alquimista',x:HALL_ALQUIMIA[0],z:HALL_ALQUIMIA[1],radius:7,model:'Cauldron'}),
  culinaria:Object.freeze({id:'culinaria',name:'Fogão da Taverna',x:HALL_TAVERNA[0],z:HALL_TAVERNA[1],radius:7,model:'Pot_1'})
});

// Tier do ponto de coleta: nível de profissão, ferramenta mínima, tempo e respawn.
const TIER_RULES=Object.freeze({
  1:Object.freeze({level:1,toolTier:1,gatherMs:2800,respawnMs:75000,charges:3,xp:14,yield:[1,2]}),
  2:Object.freeze({level:10,toolTier:1,gatherMs:3200,respawnMs:100000,charges:3,xp:26,yield:[1,2]}),
  3:Object.freeze({level:20,toolTier:2,gatherMs:3600,respawnMs:130000,charges:4,xp:42,yield:[1,2]}),
  4:Object.freeze({level:30,toolTier:2,gatherMs:4000,respawnMs:160000,charges:4,xp:62,yield:[1,2]}),
  5:Object.freeze({level:40,toolTier:3,gatherMs:4400,respawnMs:200000,charges:5,xp:88,yield:[1,3]})
});
const TOOL_TIER_NAMES=Object.freeze({1:'Bronze',2:'Ferro',3:'Astral'});

const TOOLS={};
const tool=(id,line,tier,name,icon,price=null)=>{TOOLS[id]=Object.freeze({id,line,tier,name,icon,price,speed:tier===3?.7:tier===2?.85:1});};
tool('picareta_bronze','mineracao',1,'Picareta de Bronze','⛏️',120);
tool('picareta_ferro','mineracao',2,'Picareta de Ferro','⛏️');
tool('picareta_astral','mineracao',3,'Picareta Astral','⛏️');
tool('machado_lenha_bronze','lenhador',1,'Machado de Lenha de Bronze','🪓',120);
tool('machado_lenha_ferro','lenhador',2,'Machado de Lenha de Ferro','🪓');
tool('machado_lenha_astral','lenhador',3,'Machado de Lenha Astral','🪓');
tool('foice_bronze','herbalismo',1,'Foice de Bronze','🌾',100);
tool('foice_ferro','herbalismo',2,'Foice de Ferro','🌾');
tool('foice_astral','herbalismo',3,'Foice Astral','🌾');
tool('vara_bronze','pesca',1,'Vara de Pesca de Bambu','🎣',100);
tool('vara_ferro','pesca',2,'Vara de Pesca Reforçada','🎣');
tool('vara_astral','pesca',3,'Vara de Pesca Astral','🎣');
Object.freeze(TOOLS);

// Recurso principal de cada linha por tier.
const RESOURCES=Object.freeze({
  mineracao:Object.freeze({1:'minerio_cobre',2:'minerio_ferro',3:'minerio_prata',4:'minerio_brasa',5:'minerio_astral'}),
  lenhador:Object.freeze({1:'tora_carvalho',2:'tora_bordo',3:'tora_teixo',4:'tora_cinzenta',5:'tora_palida'}),
  herbalismo:Object.freeze({1:'erva_folhaclara',2:'erva_raiz_runa',3:'erva_lirio_sombra',4:'erva_flor_brasa',5:'erva_lotus_eterea'}),
  pesca:Object.freeze({1:'peixe_lambari',2:'peixe_truta',3:'peixe_carpa',4:'peixe_enguia',5:'peixe_abissal'})
});
const NODE_NAMES=Object.freeze({
  mineracao:Object.freeze({1:'Veio de Cobre',2:'Veio de Ferro',3:'Veio de Prata',4:'Veio de Brasa',5:'Veio Astral'}),
  lenhador:Object.freeze({1:'Carvalho Antigo',2:'Bordo Rubro',3:'Teixo Sombrio',4:'Cinzaferro',5:'Salgueiro Pálido'}),
  herbalismo:Object.freeze({1:'Moita de Folha-clara',2:'Touceira de Raiz Rúnica',3:'Lírios da Sombra',4:'Flores de Brasa',5:'Lótus Etérea'}),
  pesca:Object.freeze({1:'Cardume de Lambaris',2:'Cardume de Trutas',3:'Cardume de Carpas',4:'Enguias Lunares',5:'Cardume Abissal'})
});
// Componentes raros que saem junto da coleta (chance por coleta concluída).
const BYPRODUCTS=Object.freeze({
  mineracao:Object.freeze([{id:'pedra_aprimorar',chance:.03,minTier:3}]),
  lenhador:Object.freeze([{id:'seiva_ambar',chance:.06,minTier:2}]),
  herbalismo:Object.freeze([{id:'orvalho_lunar',chance:.06,minTier:2}]),
  pesca:Object.freeze([{id:'perola_lago',chance:.06,minTier:2}])
});

const ITEMS={};
const item=(id,data)=>{ITEMS[id]=Object.freeze({id,kind:'mat',tier:1,...data});};
const tierName=['','I','II','III','IV','V'];
const RAW=[
  ['minerio_cobre','Minério de Cobre','🪨'],['minerio_ferro','Minério de Ferro','🪨'],['minerio_prata','Minério de Prata','🪨'],['minerio_brasa','Minério de Brasa','🪨'],['minerio_astral','Minério Astral','🪨'],
  ['tora_carvalho','Tora de Carvalho','🪵'],['tora_bordo','Tora de Bordo','🪵'],['tora_teixo','Tora de Teixo','🪵'],['tora_cinzenta','Tora de Cinzaferro','🪵'],['tora_palida','Tora de Salgueiro Pálido','🪵'],
  ['erva_folhaclara','Folha-clara','🌿'],['erva_raiz_runa','Raiz Rúnica','🌱'],['erva_lirio_sombra','Lírio da Sombra','🪻'],['erva_flor_brasa','Flor de Brasa','🌺'],['erva_lotus_eterea','Lótus Etérea','🪷'],
  ['peixe_lambari','Lambari Dourado','🐟'],['peixe_truta','Truta de Pedra','🐟'],['peixe_carpa','Carpa Espelhada','🐠'],['peixe_enguia','Enguia Lunar','🐍'],['peixe_abissal','Peixe Abissal','🐡']
];
RAW.forEach(([id,name,icon],i)=>{const tier=i%5+1,line=['mineracao','lenhador','herbalismo','pesca'][Math.floor(i/5)];item(id,{name,icon,tier,line,desc:`Recurso de ${PROFESSIONS[line].name} (tier ${tierName[tier]}). Usado nas receitas de criação.`});});
item('seiva_ambar',{name:'Seiva Âmbar',icon:'🍯',tier:2,desc:'Componente raro do Lenhador. Usado em combustível e estandartes.'});
item('orvalho_lunar',{name:'Orvalho Lunar',icon:'💧',tier:2,desc:'Componente raro do Herbalismo. Usado em elixires.'});
item('perola_lago',{name:'Pérola do Lago',icon:'⚪',tier:2,desc:'Componente raro da Pesca. Usado em cosméticos.'});
item('fragmento_gigante',{name:'Fragmento de Gigante',icon:'🧱',tier:4,desc:'Deixado por monstros Gigantes e World Bosses. Usado em receitas avançadas.'});
item('cristal_eco',{name:'Cristal do Eco',icon:'🔮',tier:4,desc:'Recompensa do baú da Cripta dos Ecos. Usado em receitas avançadas.'});
for(const [metal,name,tier] of [['cobre','Cobre',1],['ferro','Ferro',2],['prata','Prata',3],['brasa','Brasa',4],['astral','Astral',5]])item('lingote_'+metal,{name:`Lingote de ${name}`,icon:'🟫',tier,kind:'mat',desc:'Componente da Forja.'});
for(const [wood,name,tier] of [['carvalho','Carvalho',1],['bordo','Bordo',2],['teixo','Teixo',3],['cinzenta','Cinzaferro',4],['palida','Salgueiro Pálido',5]])item('tabua_'+wood,{name:`Tábua de ${name}`,icon:'🟧',tier,kind:'mat',desc:'Componente da Marcenaria.'});
// Consumíveis: efeitos pequenos e temporários (sem acumular), para não criar power creep.
item('peixe_assado',{name:'Lambari Assado',icon:'🍢',kind:'use',tier:1,desc:'Recupera 120 de Vida e 40 de Energia.',effect:{restore:{hp:120,fp:40}}});
item('sopa_truta',{name:'Sopa de Truta',icon:'🥣',kind:'use',tier:2,desc:'Recupera 120 de Vida e 120 de Mana.',effect:{restore:{hp:120,mp:120}}});
item('elixir_vida',{name:'Elixir de Vida',icon:'🧪',kind:'use',tier:3,desc:'Recupera 320 de Vida.',effect:{restore:{hp:320}}});
item('ensopado_carpa',{name:'Ensopado de Carpa',icon:'🍲',kind:'use',tier:3,desc:'Refeição: regenera Vida por 90 segundos.',effect:{buff:{category:'food',seconds:90,regen:1}}});
item('banquete_enguia',{name:'Banquete de Enguia',icon:'🍱',kind:'use',tier:4,desc:'Refeição: +6% de defesa por 10 minutos.',effect:{buff:{category:'food',seconds:600,def:.06}}});
item('festim_abissal',{name:'Festim Abissal',icon:'🍛',kind:'use',tier:5,desc:'Refeição: +5% de ataque e +5% de defesa por 10 minutos.',effect:{buff:{category:'food',seconds:600,atk:.05,def:.05}}});
item('elixir_furia',{name:'Elixir da Fúria',icon:'🧪',kind:'use',tier:4,desc:'Elixir: +6% de ataque por 5 minutos.',effect:{buff:{category:'elixir',seconds:300,atk:.06}}});
item('elixir_pedra',{name:'Elixir de Pedra',icon:'🧪',kind:'use',tier:4,desc:'Elixir: +8% de defesa por 5 minutos.',effect:{buff:{category:'elixir',seconds:300,def:.08}}});
item('elixir_gigante',{name:'Elixir do Gigante',icon:'🧪',kind:'use',tier:5,desc:'Elixir: +8% de ataque e +8% de defesa por 10 minutos.',effect:{buff:{category:'elixir',seconds:600,atk:.08,def:.08}}});
item('tonico_coleta',{name:'Tônico do Coletor',icon:'🍵',kind:'use',tier:2,desc:'Coletas 20% mais rápidas por 10 minutos.',effect:{lifeBuff:{id:'tonico',seconds:600,gatherSpeed:.2}}});
item('kit_reparo',{name:'Kit de Reparo',icon:'🧰',kind:'use',tier:1,desc:'Restaura 35 de durabilidade de todo o equipamento vestido.',effect:{repair:35}});
item('kit_reparo_mestre',{name:'Kit de Reparo de Mestre',icon:'🧰',kind:'use',tier:4,desc:'Restaura toda a durabilidade do equipamento vestido.',effect:{repair:100}});
// Cosméticos: liberam títulos (sem atributos).
item('insignia_forjador',{name:'Insígnia do Forjador',icon:'🎖️',kind:'use',tier:3,desc:'Cosmético: libera o título "Forjador de Claudonia".',effect:{title:'Forjador de Claudonia'}});
item('estandarte_entalhado',{name:'Estandarte Entalhado',icon:'🎏',kind:'use',tier:3,desc:'Cosmético: libera o título "Entalhador do Vale".',effect:{title:'Entalhador do Vale'}});
item('essencia_aurora',{name:'Essência da Aurora',icon:'✨',kind:'use',tier:3,desc:'Cosmético: libera o título "Alquimista da Aurora".',effect:{title:'Alquimista da Aurora'}});
item('chapeu_cozinheiro',{name:'Chapéu de Cozinheiro',icon:'👨‍🍳',kind:'use',tier:3,desc:'Cosmético: libera o título "Chef da Taverna".',effect:{title:'Chef da Taverna'}});
Object.freeze(ITEMS);

const RECIPES={};
const recipe=(id,profession,level,inputs,fee,out,xp,extra={})=>{
  const output=typeof out==='string'?{tool:out}:{id:out[0],n:out[1]};
  RECIPES[id]=Object.freeze({id,profession,level,inputs:Object.freeze(inputs.map(([itemId,n])=>Object.freeze({id:itemId,n}))),fee,output:Object.freeze(output),xp,advanced:!!extra.advanced,cosmetic:!!extra.cosmetic});
};
// Forja
recipe('f_lingote_cobre','forja',1,[['minerio_cobre',2]],4,['lingote_cobre',1],12);
recipe('f_lingote_ferro','forja',10,[['minerio_ferro',2]],10,['lingote_ferro',1],24);
recipe('f_lingote_prata','forja',20,[['minerio_prata',2]],20,['lingote_prata',1],40);
recipe('f_lingote_brasa','forja',30,[['minerio_brasa',2],['nucleo',1]],35,['lingote_brasa',1],60);
recipe('f_lingote_astral','forja',40,[['minerio_astral',2],['fragmento_gigante',1]],70,['lingote_astral',1],90,{advanced:true});
recipe('f_kit_reparo','forja',5,[['lingote_cobre',2],['tabua_carvalho',1]],25,['kit_reparo',1],20);
recipe('f_kit_reparo_mestre','forja',30,[['lingote_brasa',2],['cristal_eco',1]],120,['kit_reparo_mestre',1],80,{advanced:true});
recipe('f_pedra_aprimorar','forja',25,[['lingote_prata',2],['musgo',2]],60,['pedra_aprimorar',1],45);
recipe('f_picareta_ferro','forja',15,[['lingote_ferro',3],['tabua_bordo',2]],150,'picareta_ferro',60);
recipe('f_machado_ferro','forja',15,[['lingote_ferro',3],['tabua_bordo',2]],150,'machado_lenha_ferro',60);
recipe('f_foice_ferro','forja',15,[['lingote_ferro',2],['tabua_bordo',1],['erva_raiz_runa',2]],120,'foice_ferro',60);
recipe('f_picareta_astral','forja',40,[['lingote_astral',3],['tabua_palida',2],['cristal_eco',1]],900,'picareta_astral',150,{advanced:true});
recipe('f_machado_astral','forja',40,[['lingote_astral',3],['tabua_palida',2],['cristal_eco',1]],900,'machado_lenha_astral',150,{advanced:true});
recipe('f_foice_astral','forja',40,[['lingote_astral',2],['tabua_palida',1],['erva_lotus_eterea',2],['cristal_eco',1]],850,'foice_astral',150,{advanced:true});
recipe('f_insignia_forjador','forja',25,[['lingote_prata',3],['perola_lago',2]],400,['insignia_forjador',1],70,{cosmetic:true});
// Marcenaria
recipe('m_tabua_carvalho','marcenaria',1,[['tora_carvalho',2]],4,['tabua_carvalho',1],12);
recipe('m_tabua_bordo','marcenaria',10,[['tora_bordo',2]],10,['tabua_bordo',1],24);
recipe('m_tabua_teixo','marcenaria',20,[['tora_teixo',2]],20,['tabua_teixo',1],40);
recipe('m_tabua_cinzenta','marcenaria',30,[['tora_cinzenta',2],['seda',1]],35,['tabua_cinzenta',1],60);
recipe('m_tabua_palida','marcenaria',40,[['tora_palida',2],['fragmento_gigante',1]],70,['tabua_palida',1],90,{advanced:true});
recipe('m_combustivel','marcenaria',12,[['tabua_bordo',1],['seiva_ambar',1]],10,['combustivel',2],28);
recipe('m_vara_ferro','marcenaria',15,[['tabua_bordo',3],['lingote_ferro',1],['pelo',2]],130,'vara_ferro',60);
recipe('m_vara_astral','marcenaria',40,[['tabua_palida',3],['lingote_astral',1],['cristal_eco',1]],850,'vara_astral',150,{advanced:true});
recipe('m_estandarte_entalhado','marcenaria',20,[['tabua_teixo',3],['seiva_ambar',2]],350,['estandarte_entalhado',1],70,{cosmetic:true});
// Alquimia
recipe('a_pocao_vida','alquimia',1,[['erva_folhaclara',2]],6,['pocao_vida',2],12);
recipe('a_pocao_mana','alquimia',5,[['erva_folhaclara',2],['gosma',1]],6,['pocao_mana',2],16);
recipe('a_pocao_energia','alquimia',8,[['erva_folhaclara',1],['erva_raiz_runa',1]],6,['pocao_energia',2],20);
recipe('a_tonico_coleta','alquimia',15,[['erva_raiz_runa',2],['peixe_truta',1]],30,['tonico_coleta',1],34);
recipe('a_elixir_vida','alquimia',20,[['erva_lirio_sombra',2],['orvalho_lunar',1]],40,['elixir_vida',1],44);
recipe('a_elixir_furia','alquimia',30,[['erva_flor_brasa',2],['pele_lobo',2]],80,['elixir_furia',1],62);
recipe('a_elixir_pedra','alquimia',30,[['erva_flor_brasa',2],['musgo',2]],80,['elixir_pedra',1],62);
recipe('a_elixir_gigante','alquimia',40,[['erva_lotus_eterea',2],['fragmento_gigante',1],['cristal_eco',1]],200,['elixir_gigante',1],110,{advanced:true});
recipe('a_essencia_aurora','alquimia',25,[['erva_lirio_sombra',3],['orvalho_lunar',2]],350,['essencia_aurora',1],70,{cosmetic:true});
// Culinária
recipe('c_peixe_assado','culinaria',1,[['peixe_lambari',2]],3,['peixe_assado',1],12);
recipe('c_sopa_truta','culinaria',10,[['peixe_truta',2],['erva_folhaclara',1]],8,['sopa_truta',2],24);
recipe('c_ensopado_carpa','culinaria',20,[['peixe_carpa',2],['erva_lirio_sombra',1]],20,['ensopado_carpa',1],40);
recipe('c_banquete_enguia','culinaria',30,[['peixe_enguia',2],['erva_flor_brasa',1],['tabua_cinzenta',1]],45,['banquete_enguia',1],60);
recipe('c_festim_abissal','culinaria',40,[['peixe_abissal',2],['erva_lotus_eterea',1],['cristal_eco',1]],120,['festim_abissal',1],100,{advanced:true});
recipe('c_chapeu_cozinheiro','culinaria',20,[['peixe_carpa',3],['perola_lago',2],['seda',2]],300,['chapeu_cozinheiro',1],70,{cosmetic:true});
Object.freeze(RECIPES);

// Qualidade calculada no servidor: quanto mais a profissão passa do nível da receita, melhor a chance.
const QUALITY=Object.freeze({
  1:Object.freeze({id:1,name:'Comum',color:'#D8D0C2',bonus:0}),
  2:Object.freeze({id:2,name:'Fino',color:'#64C77B',bonus:.25}),
  3:Object.freeze({id:3,name:'Primoroso',color:'#4EA1FF',bonus:.5}),
  4:Object.freeze({id:4,name:'Obra-prima',color:'#F2B84B',bonus:1})
});
function qualityChances(margin){
  const m=Math.max(0,Math.min(30,Math.floor(Number(margin)||0)));
  return {4:Math.min(.12,.02+m*.0035),3:Math.min(.25,.06+m*.007),2:Math.min(.45,.18+m*.01)};
}
function rollQuality(margin,rng=Math.random){
  const c=qualityChances(margin),r=rng();
  if(r<c[4])return 4;
  if(r<c[4]+c[3])return 3;
  if(r<c[4]+c[3]+c[2])return 2;
  return 1;
}
// Unidades extras pela qualidade (receita de 1 unidade: +1 em Primoroso/Obra-prima).
const qualityExtra=(base,q)=>q<=1?0:Math.floor(base*QUALITY[q].bonus+.5);

// Durabilidade: equipamentos antigos sem o campo contam como inteiros (100).
const DURABILITY=Object.freeze({max:100,killWearChance:.5,armorWearChance:.25,deathLoss:10,repairNpc:'ferreiro',repairStation:'forja',repairRange:4.5});
const repairCostPerPoint=(item,rarity)=>(1+Math.max(1,Number(item&&item.req)||1)*.12)*(Number(rarity&&rarity.upgradeCost)||1);

// Materiais de dungeon por dificuldade (somados ao baú individual).
const DUNGEON_MATERIALS=Object.freeze({cripta_ecos:Object.freeze({normal:2,dificil:4})});

// Pontos de coleta distribuídos pelas regiões do mundo (tier acompanha o nível da região).
const ZONE_TIER=Object.freeze({bolota:1,coelhorn:1,cogumelo:2,javali:2,golem:2,lobo:3,aranha:3,espirito:4,ciclope:4,ossario:5,'legionário':5,espectro:5,necromante:5});
const slug=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/gi,'_').toLowerCase();
function buildNodes(){
  const out=[],count=new Map();
  const push=(line,zone,tier,x,z,extra={})=>{
    const key=`${line}_${slug(zone)}`,n=(count.get(key)||0)+1;count.set(key,n);
    const T=TIER_RULES[tier];
    out.push(Object.freeze({id:`${key}_${n}`,line,tier,zone,name:NODE_NAMES[line][tier],item:RESOURCES[line][tier],
      x:Math.round(x*100)/100,z:Math.round(z*100)/100,level:T.level,toolTier:T.toolTier,gatherMs:T.gatherMs,respawnMs:T.respawnMs,
      charges:T.charges,xp:T.xp,yield:T.yield,water:!!extra.water,range:line==='pesca'?4.2:3.2}));
  };
  for(const [zone,tier] of Object.entries(ZONE_TIER)){
    const Z=ZONES[zone];if(!Z)continue;
    const base=Math.atan2(-Z.z,-Z.x),radius=Z.radius+6;
    const slots=[['mineracao',40],['lenhador',-40],['herbalismo',78]];
    if(tier===1)slots.push(['mineracao',115],['lenhador',-115],['herbalismo',150]);
    for(const [line,deg] of slots){const a=base+deg*Math.PI/180;push(line,zone,tier,Z.x+Math.cos(a)*radius,Z.z+Math.sin(a)*radius);}
  }
  // Lagoas de pesca (as do Lago Espelhado ficam na margem do lago real).
  for(const [zone,tier,deg] of [['bolota',1,-80],['bolota',1,-100],['coelhorn',1,-80],['cogumelo',2,-80],['javali',2,-80],['lobo',3,-80],['aranha',3,-80],['ossario',5,-80],['legionário',5,-80]]){
    const Z=ZONES[zone],a=Math.atan2(-Z.z,-Z.x)+deg*Math.PI/180,radius=Z.radius+9;
    push('pesca',zone,tier,Z.x+Math.cos(a)*radius,Z.z+Math.sin(a)*radius,{water:true});
  }
  const lakeBase=Math.atan2(-LAKE.z,-LAKE.x);
  for(const deg of [-28,0,28]){const a=lakeBase+deg*Math.PI/180;push('pesca','espirito',4,LAKE.x+Math.cos(a)*(LAKE.r+2.5),LAKE.z+Math.sin(a)*(LAKE.r+2.5));}
  return Object.freeze(out);
}
const NODES=buildNodes();

module.exports={
  MAX_PROF_LEVEL,xpNeed,PROFESSIONS,STATIONS,TIER_RULES,TOOL_TIER_NAMES,TOOLS,RESOURCES,NODE_NAMES,BYPRODUCTS,ITEMS,RECIPES,
  QUALITY,qualityChances,rollQuality,qualityExtra,DURABILITY,repairCostPerPoint,DUNGEON_MATERIALS,ZONE_TIER,NODES
};
