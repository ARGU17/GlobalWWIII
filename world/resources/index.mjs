export const resourceCatalog=state=>Object.keys(state.countries?.[0]?.v5?.economy?.products||{});
export const countryResources=(state,countryId)=>state.countries.find(x=>x.id===countryId)?.v5?.economy?.products||{};
