import{WorldRepository}from"../repository.mjs";
export const regionsRepository=new WorldRepository("regions",s=>s.regions||[]);
