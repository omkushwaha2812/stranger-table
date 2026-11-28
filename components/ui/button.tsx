import * as React from 'react';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
export const buttonVariants=cva('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-50',{variants:{variant:{default:'bg-forest text-white hover:bg-[#25372a]',outline:'border border-forest text-forest hover:bg-sage/30',ghost:'text-forest hover:bg-sage/30'},size:{default:'px-6 py-3',sm:'px-4 py-2 text-sm',lg:'px-8 py-4'}},defaultVariants:{variant:'default',size:'default'}});
export const Button=React.forwardRef<HTMLButtonElement,React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof buttonVariants>>(({className,variant,size,...props},ref)=><button ref={ref} className={cn(buttonVariants({variant,size}),className)} {...props}/>);Button.displayName='Button';
