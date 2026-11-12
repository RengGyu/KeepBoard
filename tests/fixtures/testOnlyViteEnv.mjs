// TEST_ONLY photo-reading-flow: run the actual workspace in either Vite DEV branch without a server or build output.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(new URL(url).pathname.endsWith('/src/SessionWorkspace.tsx')){
  const dev=new URL(url).searchParams.get('test-dev')!=='false';
  return {...result,source:String(result.source).replaceAll('import.meta.env',`({DEV:${dev}})`) };
 }
 return result;
}
