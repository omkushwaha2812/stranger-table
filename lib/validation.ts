import {z} from 'zod';
export const email=z.string().trim().email().max(254);
export const password=z.string().min(8).max(72);
export const identity=z.object({name:z.string().trim().min(1).max(100),city:z.string().trim().min(1).max(100),gender:z.string().trim().min(1).max(100),terms:z.literal('on')});
export const registration=identity.extend({email,password,confirm:password}).refine(v=>v.password===v.confirm,{message:'Passwords must match'});
export const personal=z.object({name:z.string().trim().min(1).max(100),bio:z.string().trim().max(500),city:z.string().trim().min(1).max(100),gender:z.string().trim().min(1).max(100)});
export const selections=z.array(z.string().uuid()).min(1).max(32);
export const meetup=z.object({category:z.string().uuid()});
