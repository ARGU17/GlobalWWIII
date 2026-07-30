import{WorldRepository}from"../repository.mjs";
export const citiesRepository=new WorldRepository("cities",s=>(s.countries||[]).flatMap(c=>(c.v51?.cities||[]).map(x=>({...x,countryId:c.id}))));
