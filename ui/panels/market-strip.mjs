const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const number=value=>new Intl.NumberFormat("es-ES",{minimumFractionDigits:1,maximumFractionDigits:1}).format(Number(value)||0);
const finite=value=>Number.isFinite(Number(value))?Number(value):0;

export function marketStripModel(country,definitions){
  const products=country?.v5?.economy?.products||{};
  return definitions.map(definition=>{
    const product=products[definition.id]||{};
    const production=finite(product.production??product.supply);
    const demand=finite(product.demand??(finite(product.intermediateConsumption)+finite(product.householdConsumption)+finite(product.publicConsumption)));
    const balance=finite(product.deficitSurplus??production-demand);
    return{...definition,production,demand,balance,inventory:finite(product.inventory),imports:finite(product.imports),exports:finite(product.exports),nationalPrice:finite(product.nationalPrice??product.price),internationalPrice:finite(product.internationalPrice)};
  });
}

export function renderMarketStrip(country,definitions){
  return marketStripModel(country,definitions).map(market=>{
    const direction=market.balance>=0?"surplus":"deficit",sign=market.balance>=0?"+":"";
    const details=`${market.name}. Producción ${number(market.production)} ${market.unit}; demanda ${number(market.demand)} ${market.unit}; balance ${sign}${number(market.balance)}; inventario ${number(market.inventory)}; importaciones ${number(market.imports)}; exportaciones ${number(market.exports)}; precio nacional ${number(market.nationalPrice)}.`;
    return`<article class="top-resource ${direction}" data-market-id="${esc(market.id)}" data-market-group="${esc(market.group)}" style="--resource-accent:${esc(market.accent)}" title="${esc(details)}" aria-label="${esc(details)}"><span aria-hidden="true">${market.icon}</span><div><b>${esc(market.name)}</b><small>${number(market.production)} / ${number(market.demand)} ${esc(market.unit)}</small></div><strong>${sign}${number(market.balance)}</strong></article>`;
  }).join("");
}
