import{WorldRepository}from"../repository.mjs";
export const infrastructureRepository=new WorldRepository("infrastructure",s=>s.v51?.logistics?.nodes||[]);
