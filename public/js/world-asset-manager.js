(function(global){
  'use strict';

  class WorldAssetManager {
    constructor({scene,heightAt,highQuality=true}){
      this.scene=scene;this.heightAt=heightAt;this.highQuality=highQuality;this.loader=new THREE.GLTFLoader();this.cache=new Map();this.instances=[];
    }
    load(url){
      if(!this.cache.has(url))this.cache.set(url,new Promise((resolve,reject)=>this.loader.load(url,g=>resolve(g.scene),undefined,reject)));
      return this.cache.get(url);
    }
    clone(source){return global.THREE.SkeletonUtils&&global.THREE.SkeletonUtils.clone?global.THREE.SkeletonUtils.clone(source):source.clone(true);}
    async place(url,{x,z,y,rotation=0,height=2,scale=1,parent,ground=true,maxDistance=155}={}){
      try{
        const source=await this.load(url),object=this.clone(source),box=new THREE.Box3().setFromObject(object),size=new THREE.Vector3();box.getSize(size);
        const factor=(height&&size.y?height/size.y:1)*scale;object.scale.setScalar(factor);object.rotation.y=rotation;
        const baseY=ground?(this.heightAt(x,z)-(box.min.y*factor)):(y||0);object.position.set(x||0,baseY,z||0);
        object.traverse(o=>{if(o.isMesh){o.castShadow=this.highQuality;o.receiveShadow=this.highQuality;o.frustumCulled=true;}});
        object.userData.worldAsset=true;object.userData.maxDistance=maxDistance;(parent||this.scene).add(object);this.instances.push(object);return object;
      }catch(error){console.warn('[WorldAssets] Falha ao carregar',url,error);return null;}
    }
    update(cameraPosition){for(const object of this.instances){if(!object.parent)continue;const dx=object.getWorldPosition(WorldAssetManager._v).x-cameraPosition.x,dz=WorldAssetManager._v.z-cameraPosition.z;object.visible=dx*dx+dz*dz<=(object.userData.maxDistance||155)**2;}}
    async replaceMonster(monster,url,height){
      if(monster.assetVisual)return monster.assetVisual;
      try{const source=await this.load(url),object=this.clone(source),box=new THREE.Box3().setFromObject(object),size=new THREE.Vector3();box.getSize(size);const factor=height/Math.max(.001,size.y);object.scale.setScalar(factor);object.position.y=-box.min.y*factor;object.traverse(o=>{if(o.isMesh){o.castShadow=this.highQuality;o.receiveShadow=this.highQuality;}});monster.body.visible=false;monster.mesh.add(object);monster.assetVisual=object;return object;}catch(error){console.warn('[WorldAssets] Monstro premium indisponível',error);return null;}
    }
  }
  WorldAssetManager._v=new THREE.Vector3();

  const N='/assets/kits/nature/',P='/assets/kits/props/',M='/assets/kits/monsters/';
  global.CLAUDONIA_WORLD_ASSETS={
    paths:{nature:N,props:P,monsters:M},
    regions:{
      bolota:['CommonTree_1','Bush_Common_Flowers','Flower_3_Group'],coelhorn:['CommonTree_3','Bush_Common','Plant_1'],
      cogumelo:['TwistedTree_1','Mushroom_Common','Fern_1'],javali:['DeadTree_1','Rock_Medium_1','Bush_Common'],
      golem:['Rock_Medium_2','Rock_Medium_3','DeadTree_1'],lobo:['Pine_1','CommonTree_3','Fern_1'],
      aranha:['TwistedTree_1','DeadTree_1','Mushroom_Common'],espirito:['CommonTree_1','Flower_3_Group','Plant_1'],
      ciclope:['Rock_Medium_3','DeadTree_1','Rock_Medium_1']
    },
    heights:{CommonTree_1:8,CommonTree_3:7,Pine_1:8,DeadTree_1:7,TwistedTree_1:7,Bush_Common:1.6,Bush_Common_Flowers:1.6,Fern_1:1,Flower_3_Group:.75,Grass_Common_Short:.45,Mushroom_Common:.65,Rock_Medium_1:1.5,Rock_Medium_2:1.8,Rock_Medium_3:2,Plant_1:.9},
    monsterVariants:{golem:'Puglin.glb',ciclope:'Puglin.glb',aranha:'Imp.glb',espirito:'Imp.glb'}
  };
  global.WorldAssetManager=WorldAssetManager;
})(window);
