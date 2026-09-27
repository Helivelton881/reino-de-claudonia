'use strict';

class SpawnManager {
  constructor(zones, rng = Math.random) { this.zones = zones; this.rng = rng; }
  point(zoneKey) {
    const zone = this.zones[zoneKey];
    if (!zone) throw new Error(`Zona desconhecida: ${zoneKey}`);
    const angle = this.rng()*Math.PI*2;
    const radius = Math.sqrt(this.rng())*zone.radius*0.82;
    return { x:zone.x+Math.cos(angle)*radius, z:zone.z+Math.sin(angle)*radius };
  }
}

module.exports = SpawnManager;
