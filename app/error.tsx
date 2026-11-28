'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main className="mx-auto max-w-lg p-8"><h1 className="text-3xl">Something went wrong.</h1><p className="my-4">Please try again.</p><button className="primary" onClick={reset}>Retry</button></main>}
