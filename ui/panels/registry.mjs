export class PanelRegistry{
  constructor(){this.panels=new Map()}
  register(id,renderer){if(this.panels.has(id))throw new Error(`Panel duplicado: ${id}`);if(typeof renderer!=="function")throw new Error(`Renderer inválido: ${id}`);this.panels.set(id,renderer)}
  render(id,state){const renderer=this.panels.get(id);if(!renderer)throw new Error(`Panel no registrado: ${id}`);return renderer(state)}
}
