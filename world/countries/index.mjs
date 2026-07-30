import{WorldRepository}from"../repository.mjs";
export const countriesRepository=new WorldRepository("countries",s=>(s.countries||[]).filter(x=>x.sovereign!==false));
