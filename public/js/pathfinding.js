// Reino De Claudonia - A* pathfinding 2D para movimento no continente.
(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ClaudoniaPathfinding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  class MinHeap {
    constructor(){ this.a = []; }
    get size(){ return this.a.length; }
    push(item){
      const a = this.a; a.push(item);
      let i = a.length - 1;
      while (i > 0){
        const p = (i - 1) >> 1;
        if (a[p].f <= item.f) break;
        a[i] = a[p]; i = p;
      }
      a[i] = item;
    }
    pop(){
      const a = this.a;
      if (!a.length) return null;
      const root = a[0], last = a.pop();
      if (a.length){
        let i = 0;
        while (true){
          const l = i*2 + 1, r = l + 1;
          if (l >= a.length) break;
          let c = r < a.length && a[r].f < a[l].f ? r : l;
          if (a[c].f >= last.f) break;
          a[i] = a[c]; i = c;
        }
        a[i] = last;
      }
      return root;
    }
  }

  const SQRT2 = Math.SQRT2;
  const keyOf = (x,z) => x + ',' + z;
  const octile = (ax,az,bx,bz) => {
    const dx = Math.abs(ax-bx), dz = Math.abs(az-bz);
    return Math.max(dx,dz) + (SQRT2 - 1)*Math.min(dx,dz);
  };

  class GridPathfinder {
    constructor(opts){
      opts = opts || {};
      if (typeof opts.isWalkable !== 'function') throw new Error('GridPathfinder requer isWalkable(x,z)');
      if (typeof opts.lineClear !== 'function') throw new Error('GridPathfinder requer lineClear(ax,az,bx,bz)');
      this.step = opts.step || 1.4;
      this.maxNodes = opts.maxNodes || 40000;
      this.nearestRadius = opts.nearestRadius || 8;
      this.isWalkable = opts.isWalkable;
      this.lineClear = opts.lineClear;
    }

    _grid(v){ return Math.round(v / this.step); }
    _world(v){ return v * this.step; }

    findPath(start, goal){
      if (!start || !goal) return [];
      if (![start.x,start.z,goal.x,goal.z].every(Number.isFinite)) return [];

      if (this.lineClear(start.x,start.z,goal.x,goal.z))
        return [{x:goal.x,z:goal.z}];

      const walkCache = new Map();
      const walkGrid = (gx,gz) => {
        const k = keyOf(gx,gz);
        if (walkCache.has(k)) return walkCache.get(k);
        const ok = !!this.isWalkable(this._world(gx), this._world(gz));
        walkCache.set(k, ok);
        return ok;
      };

      const nearest = (gx,gz) => {
        if (walkGrid(gx,gz)) return {x:gx,z:gz};
        for (let r=1;r<=this.nearestRadius;r++){
          for (let dz=-r;dz<=r;dz++){
            for (let dx=-r;dx<=r;dx++){
              if (Math.max(Math.abs(dx),Math.abs(dz)) !== r) continue;
              const x = gx+dx, z = gz+dz;
              if (walkGrid(x,z)) return {x,z};
            }
          }
        }
        return null;
      };

      const s = nearest(this._grid(start.x), this._grid(start.z));
      const g = nearest(this._grid(goal.x), this._grid(goal.z));
      if (!s || !g) return [];

      const sk = keyOf(s.x,s.z), gk = keyOf(g.x,g.z);
      if (sk === gk){
        const p = {x:this._world(g.x),z:this._world(g.z)};
        return this.lineClear(start.x,start.z,goal.x,goal.z) ? [{x:goal.x,z:goal.z}] : [p];
      }

      const open = new MinHeap(), came = new Map(), score = new Map(), closed = new Set();
      score.set(sk, 0);
      open.push({x:s.x,z:s.z,k:sk,g:0,f:octile(s.x,s.z,g.x,g.z)});
      const dirs = [
        [1,0,1],[-1,0,1],[0,1,1],[0,-1,1],
        [1,1,SQRT2],[1,-1,SQRT2],[-1,1,SQRT2],[-1,-1,SQRT2]
      ];

      let expanded = 0, found = false;
      while (open.size && expanded < this.maxNodes){
        const cur = open.pop();
        if (!cur || closed.has(cur.k)) continue;
        closed.add(cur.k); expanded++;
        if (cur.k === gk){ found = true; break; }

        for (const [dx,dz,cost] of dirs){
          const nx = cur.x+dx, nz = cur.z+dz;
          if (!walkGrid(nx,nz)) continue;
          if (dx && dz && (!walkGrid(cur.x+dx,cur.z) || !walkGrid(cur.x,cur.z+dz))) continue;
          const nk = keyOf(nx,nz);
          if (closed.has(nk)) continue;
          const ng = cur.g + cost;
          if (ng >= (score.get(nk) ?? Infinity)) continue;
          score.set(nk,ng); came.set(nk,cur.k);
          open.push({x:nx,z:nz,k:nk,g:ng,f:ng+octile(nx,nz,g.x,g.z)});
        }
      }
      if (!found) return [];

      const nodes = [];
      let k = gk;
      while (k){
        const [x,z] = k.split(',').map(Number);
        nodes.push({x:this._world(x),z:this._world(z)});
        if (k === sk) break;
        k = came.get(k);
      }
      nodes.reverse();

      if (nodes.length && Math.hypot(nodes[0].x-start.x,nodes[0].z-start.z) < this.step*0.8) nodes.shift();
      if (!nodes.length) return [];

      const last = nodes[nodes.length-1];
      if (this.lineClear(last.x,last.z,goal.x,goal.z)) nodes.push({x:goal.x,z:goal.z});

      const smooth = [];
      let ax = start.x, az = start.z, i = 0;
      while (i < nodes.length){
        let far = i;
        for (let j=nodes.length-1;j>=i;j--){
          if (this.lineClear(ax,az,nodes[j].x,nodes[j].z)){ far = j; break; }
        }
        const p = nodes[far];
        smooth.push(p); ax = p.x; az = p.z; i = far + 1;
      }
      return smooth;
    }
  }

  return { GridPathfinder };
});
