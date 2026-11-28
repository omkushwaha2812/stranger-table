import {cn} from '@/lib/utils';
export function Card({className,...props}:React.HTMLAttributes<HTMLElement>){return <article className={cn('rounded-3xl border border-forest/10 bg-white/65 p-7',className)} {...props}/>;}
