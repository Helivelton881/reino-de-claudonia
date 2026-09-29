'use strict';

const { GridPathfinder } = require('../../public/js/pathfinding');
const { solidNaturalColliders, STATIC_NPCS, STATIC_PROP_COLLIDERS } = require('../../public/js/world-collision-map');

const WORLD_RADIUS = 185;
const CELL = 8;

const ZONE_POINTS = [
  [30,32],[-42,40],[-58,-38],[62,-32],[5,-88],
  [105,42],[-105,-85],[-80,98],[40,128]
];

const PATHS = ZONE_POINTS.map(([x,z]) => [
  [0,0],
  [x*0.5 + (z>0?8:-8), z*0.5 + (x>0?-6:6)],
  [x,z]
]);

function distPath(x,z){
  let best = Infinity;
  for(const P of PATHS){
    for(let i=0;i<P.length-1;i++){
      const [ax,az]=P[i], [bx,bz]=P[i+1];
      const vx=bx-ax, vz=bz-az, l2=vx*vx+vz*vz;
      const t=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/l2));
      const dx=x-(ax+vx*t), dz=z-(az+vz*t);
      best=Math.min(best,dx*dx+dz*dz);
    }
  }
  return Math.sqrt(best);
}

function townPoint(cx,cz,rot,lx,lz){
  const c=Math.cos(rot), s=Math.sin(rot);
  return {x:cx+lx*c+lz*s,z:cz-lx*s+lz*c};
}

function structuralColliders(){
  const out=[{x:0,z:0,r:1.4,kind:'well'}];

  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2+0.13;
    out.push({x:Math.cos(a)*17.2,z:Math.sin(a)*17.2,r:0.3,kind:'lamp'});
  }

  for(let i=0;i<11;i++){
    const a=i/11*Math.PI*2+0.2;
    const rr=40+(i%3)*7, x=Math.cos(a)*rr, z=Math.sin(a)*rr;
    if(distPath(x,z)<6) continue;
    const s=0.9+(i%2)*0.2;
    out.push({x,z,r:3.2*s,kind:'cottage'});
  }

  [[22,-12],[-23,10],[-10,-24]].forEach(([x,z]) =>
    out.push({x,z,r:1.4,kind:'stall'})
  );

  const halls=[[0,27],[27,0],[-27,0],[-19,-19]];
  for(const [x,z] of halls){
    const rot=Math.atan2(x,z);
    for(let k=-3.6;k<=3.61;k+=0.9){
      const p=townPoint(x,z,rot,k,2.86);
      out.push({x:p.x,z:p.z,r:0.45,kind:'hall-wall'});
    }
    for(let k=-2.4;k<=2.41;k+=0.9){
      for(const sx of [-3.86,3.86]){
        const p=townPoint(x,z,rot,sx,k);
        out.push({x:p.x,z:p.z,r:0.45,kind:'hall-wall'});
      }
    }
  }

  return out;
}

class WorldNavigation {
  constructor({step=1.4,maxNodes=30000}={}){
    this.step=step;
    this.maxNodes=maxNodes;
    this.colliders=structuralColliders().concat(solidNaturalColliders(), STATIC_NPCS, STATIC_PROP_COLLIDERS);
    this.grid=new Map();
    this.cache=new Map();
    for(const c of this.colliders)this._add(c);
  }

  _key(i,j){ return i*10007+j; }

  _add(c){
    const i0=Math.floor((c.x-c.r)/CELL), i1=Math.floor((c.x+c.r)/CELL);
    const j0=Math.floor((c.z-c.r)/CELL), j1=Math.floor((c.z+c.r)/CELL);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){
      const k=this._key(i,j);
      if(!this.grid.has(k))this.grid.set(k,[]);
      this.grid.get(k).push(c);
    }
  }

  nearby(x,z){
    return this.grid.get(this._key(Math.floor(x/CELL),Math.floor(z/CELL))) || [];
  }

  blockedAt(x,z,pad=0){
    return this.nearby(x,z).some(c=>Math.hypot(c.x-x,c.z-z)<c.r+pad);
  }

  isWalkable(x,z,pad=0){
    return Math.hypot(x,z)<WORLD_RADIUS-1.7 && !this.blockedAt(x,z,pad);
  }

  lineClear(ax,az,bx,bz,pad=0){
    const d=Math.hypot(bx-ax,bz-az);
    const n=Math.max(1,Math.ceil(d/0.42));
    for(let i=0;i<=n;i++){
      const k=i/n, x=ax+(bx-ax)*k, z=az+(bz-az)*k;
      if(!this.isWalkable(x,z,pad))return false;
    }
    return true;
  }

  _pathfinder(pad){
    const bucket=Math.round(Math.max(0,pad)*10)/10;
    if(!this.cache.has(bucket)){
      this.cache.set(bucket,new GridPathfinder({
        step:this.step,
        maxNodes:this.maxNodes,
        nearestRadius:10,
        isWalkable:(x,z)=>this.isWalkable(x,z,bucket),
        lineClear:(ax,az,bx,bz)=>this.lineClear(ax,az,bx,bz,bucket)
      }));
    }
    return this.cache.get(bucket);
  }

  findPath(start,goal,pad=0){
    return this._pathfinder(pad).findPath(start,goal);
  }

  findApproachPath(start,target,range,pad=0){
    const radius=Math.max(range*0.82,pad+0.55);
    const base=Math.atan2(start.z-target.z,start.x-target.x);
    let best=null;
    for(let i=0;i<12;i++){
      const a=base+i*Math.PI/6;
      const goal={x:target.x+Math.cos(a)*radius,z:target.z+Math.sin(a)*radius};
      if(!this.isWalkable(goal.x,goal.z,pad))continue;
      if(!this.lineClear(goal.x,goal.z,target.x,target.z,Math.min(0.18,pad*0.35)))continue;
      const path=this.findPath(start,goal,pad);
      if(!path.length)continue;
      let px=start.x,pz=start.z,cost=0;
      for(const p of path){cost+=Math.hypot(p.x-px,p.z-pz);px=p.x;pz=p.z;}
      if(!best||cost<best.cost)best={path,goal,cost};
    }
    return best;
  }
}

module.exports={WorldNavigation,structuralColliders,WORLD_RADIUS};
