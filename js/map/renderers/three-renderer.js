"use strict";

import{asArray,latitudeOf,longitudeOf,validPosition}from"./render-utils.js";

const MODEL_BY_TYPE={land:"unit-land.gltf",air:"unit-air.gltf",naval:"unit-naval.gltf",industry:"industry.gltf",power:"power.gltf",port:"port.gltf"};

function kindOf(entity){const type=String(entity?.unitType||entity?.typeId||entity?.type||entity?.category||"").toLowerCase();if(/fighter|bomber|drone|air/.test(type))return"air";if(/ship|naval|carrier|submarine|destroyer|frigate|port/.test(type))return type.includes("port")?"port":"naval";if(/power|solar|wind|nuclear|hydro/.test(type))return"power";if(/plant|factory|mill|fab|mine|industry/.test(type))return"industry";return"land"}

export class ThreeRenderer{
  constructor({renderer,assetManager,mapState}={}){this.renderer=renderer;this.assets=assetManager;this.state=mapState;this.THREE=null;this.GLTFLoader=null;this.scene=null;this.camera=null;this.webglRenderer=null;this.layer=null;this.entity=null;this.object=null;this.mode="political";this.loadingToken=0;this.modelCache=new Map();this.enabled=true;this.profile={models3d:true,particles:true,shadows:"medium"};this.snapshot=null;this.sun=null;this.ambient=null}

  async initialize(){
    try{
      this.THREE=globalThis.THREE||await import(this.assets.resolve("assets/vendor/three/three.module.min.js"));
      try{const module=await import(this.assets.resolve("assets/vendor/three/GLTFLoader.js"));this.GLTFLoader=module.GLTFLoader}catch(error){this.assets.recordFailure("three-gltf-loader",error)}
      this.addCustomLayer();return true;
    }catch(error){this.assets.recordFailure("three-runtime",error);return false}
  }

  addCustomLayer(){
    const map=this.renderer.map,self=this;
    this.layer={
      id:"nexus-three-selected",type:"custom",renderingMode:"3d",
      onAdd(_map,gl){
        const T=self.THREE;self.camera=new T.Camera();self.scene=new T.Scene();
        self.ambient=new T.HemisphereLight(0xe7f6ff,0x243326,1.15);self.scene.add(self.ambient);self.sun=new T.DirectionalLight(0xfff0cf,1.45);self.sun.position.set(25,-18,35);self.scene.add(self.sun);
        self.webglRenderer=new T.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});self.webglRenderer.autoClear=false;
      },
      render(gl,matrixOrOptions){self.render(gl,matrixOrOptions)}
    };
    if(!map.getLayer(this.layer.id))map.addLayer(this.layer);
  }

  selectFromSnapshot(snapshot){
    const selectedId=this.state.selectedEntityId||snapshot?.selectedEntityId;
    let entity=selectedId?[...asArray(snapshot?.units),...asArray(snapshot?.facilities),...asArray(snapshot?.industries),...asArray(snapshot?.powerPlants)].find(item=>(item.entityId||item.id)===selectedId):null;
    if(!entity&&this.state.selectedRegionId)entity=[...asArray(snapshot?.facilities),...asArray(snapshot?.units)].find(item=>item.regionId===this.state.selectedRegionId&&validPosition(item));
    this.setEntity(entity);
  }

  async setEntity(entity){
    if(entity&&(entity.entityId||entity.id)===(this.entity?.entityId||this.entity?.id))return;
    this.entity=entity||null;this.loadingToken++;if(this.object&&this.scene){this.scene.remove(this.object);this.disposeObject(this.object);this.object=null}
    if(!entity||!this.scene||!validPosition(entity))return;
    const token=this.loadingToken,kind=kindOf(entity),object=await this.loadModel(kind).catch(error=>{this.assets.recordFailure(`model:${kind}`,error);return this.createProceduralModel(kind)});
    if(token!==this.loadingToken){this.disposeObject(object);return}
    this.object=object;this.object.name=entity.displayName||entity.name||entity.id||kind;this.addVisualEffects(this.object,kind);this.scene.add(this.object);this.renderer.map.triggerRepaint();
  }

  async loadModel(kind){
    if(!this.GLTFLoader)return this.createProceduralModel(kind);
    if(this.modelCache.has(kind)){const clone=this.modelCache.get(kind).clone(true);clone.userData.nexusSharedModel=true;return clone}
    const file=MODEL_BY_TYPE[kind]||MODEL_BY_TYPE.land,url=this.assets.resolve(`assets/models/${file}`),loader=new this.GLTFLoader();
    const gltf=await loader.loadAsync(url);const model=gltf.scene||gltf.scenes?.[0];if(!model)throw new Error(`El modelo ${file} no contiene escena`);this.modelCache.set(kind,model);const clone=model.clone(true);clone.userData.nexusSharedModel=true;return clone;
  }

  createProceduralModel(kind){
    const T=this.THREE,group=new T.Group(),material=new T.MeshStandardMaterial({color:kind==="air"?0x63bde8:kind==="naval"?0x3d8ec9:kind==="power"?0xf3cd55:kind==="industry"?0x76a6aa:0x5ac989,roughness:.64,metalness:.28});
    if(kind==="air"){
      const body=new T.Mesh(new T.ConeGeometry(.35,2.4,8),material);body.rotation.z=-Math.PI/2;group.add(body);const wing=new T.Mesh(new T.BoxGeometry(1.8,.08,.55),material);group.add(wing);
    }else if(kind==="naval"||kind==="port"){
      const hull=new T.Mesh(new T.BoxGeometry(2.5,.45,.75),material);hull.position.z=.25;group.add(hull);const tower=new T.Mesh(new T.BoxGeometry(.45,.55,.42),material);tower.position.set(.25,0,.7);group.add(tower);
    }else if(kind==="industry"||kind==="power"){
      const base=new T.Mesh(new T.BoxGeometry(1.9,1.4,.7),material);base.position.z=.35;group.add(base);const stack=new T.Mesh(new T.CylinderGeometry(.16,.22,1.8,10),material);stack.rotation.x=Math.PI/2;stack.position.set(.45,0,1.25);group.add(stack);
    }else{
      const base=new T.Mesh(new T.BoxGeometry(1.9,.85,.5),material);base.position.z=.3;group.add(base);const turret=new T.Mesh(new T.CylinderGeometry(.38,.45,.32,12),material);turret.rotation.x=Math.PI/2;turret.position.z=.72;group.add(turret);const barrel=new T.Mesh(new T.CylinderGeometry(.07,.07,1.35,8),material);barrel.rotation.y=Math.PI/2;barrel.position.set(.75,0,.75);group.add(barrel);
    }
    return group;
  }

  addVisualEffects(object,kind){
    if(!object||!this.THREE)return;object.userData.nexusKind=kind;const T=this.THREE;
    if(["industry","power","port"].includes(kind)){const light=new T.PointLight(kind==="power"?0xffdc70:0x74d9ff,2.2,8);light.position.set(0,0,2);light.userData.nexusNightLight=true;object.add(light)}
    if(this.profile.particles!==false&&kind==="industry"){const material=new T.MeshBasicMaterial({color:0xb9c8ce,transparent:true,opacity:.22,depthWrite:false});for(let index=0;index<3;index++){const puff=new T.Mesh(new T.SphereGeometry(.18+index*.08,8,6),material.clone());puff.position.set(.45,0,1.75+index*.45);puff.userData.nexusSmoke=index;object.add(puff)}}
  }

  render(_gl,matrixOrOptions){
    if(!this.enabled||!this.entity||!this.object||this.mode==="political"||!validPosition(this.entity))return;
    const maplibre=globalThis.maplibregl,T=this.THREE,map=this.renderer.map;
    const altitude=Number(map.queryTerrainElevation?.([longitudeOf(this.entity),latitudeOf(this.entity)],{exaggerated:false})||0)+40;
    const mercator=maplibre.MercatorCoordinate.fromLngLat([longitudeOf(this.entity),latitudeOf(this.entity)],altitude),scale=mercator.meterInMercatorCoordinateUnits()*(this.mode==="terrain"?32000:22000);
    const projection=matrixOrOptions?.defaultProjectionData?.mainMatrix||matrixOrOptions?.mainMatrix||matrixOrOptions;
    if(!projection||projection.length!==16)return;
    const transform=new T.Matrix4().makeTranslation(mercator.x,mercator.y,mercator.z).scale(new T.Vector3(scale,-scale,scale)).multiply(new T.Matrix4().makeRotationX(Math.PI/2));
    this.camera.projectionMatrix=new T.Matrix4().fromArray(projection).multiply(transform);
    const time=performance.now()/1000;this.object.rotation.z=Math.sin(time*.8)*.035;const fraction=Number(this.snapshot?.clockFraction??.5),solar=Math.cos((fraction-.5)*Math.PI*2),night=Math.max(0,Math.min(1,(.15-solar)/.7));if(this.sun)this.sun.intensity=.35+(1-night)*1.15;if(this.ambient)this.ambient.intensity=.4+(1-night)*.7;this.object.traverse?.(child=>{if(child.userData?.nexusNightLight)child.intensity=.2+night*3;if(Number.isInteger(child.userData?.nexusSmoke)){const phase=(time*.18+child.userData.nexusSmoke/3)%1;child.position.z=1.7+phase*1.8;child.scale.setScalar(.7+phase*.9);if(child.material)child.material.opacity=(1-phase)*.24}});
    this.webglRenderer.resetState();this.webglRenderer.render(this.scene,this.camera);map.triggerRepaint();
  }

  setMode(mode){this.mode=mode;this.renderer.map?.triggerRepaint()}
  setQuality(profile={}){this.profile={...this.profile,...profile};this.enabled=this.profile.models3d!==false;if(this.object)this.object.visible=this.enabled;this.renderer.map?.triggerRepaint();return this.profile}
  update(snapshot){this.snapshot=snapshot;this.selectFromSnapshot(snapshot)}
  disposeObject(object,{force=false}={}){if(object?.userData?.nexusSharedModel&&!force)return;object?.traverse?.(child=>{child.geometry?.dispose?.();if(Array.isArray(child.material))child.material.forEach(material=>material.dispose?.());else child.material?.dispose?.()})}
  destroy(){this.loadingToken++;if(this.object)this.disposeObject(this.object);for(const model of this.modelCache.values())this.disposeObject(model,{force:true});this.modelCache.clear();this.webglRenderer?.dispose?.();if(this.renderer.map?.getLayer(this.layer?.id))this.renderer.map.removeLayer(this.layer.id);this.layer=null}
}

globalThis.NEXUS_ThreeRenderer=ThreeRenderer;
