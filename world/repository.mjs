export class WorldRepository{
  constructor(name,select){this.name=name;this.select=select}
  all(state){return this.select(state)}
  byId(state,id){return this.all(state).find(x=>x.id===id)||null}
  count(state){return this.all(state).length}
}
