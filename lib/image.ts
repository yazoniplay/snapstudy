export async function imageToBase64(uri:string){
  const response=await fetch(uri);
  const blob=await response.blob();
  return await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onloadend=()=>resolve(String(reader.result).split(",")[1]||"");
    reader.onerror=reject;
    reader.readAsDataURL(blob);
  });
}