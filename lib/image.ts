let pendingImage="";
export function setPendingImage(image:string){pendingImage=image;}
export function takePendingImage(){const image=pendingImage;pendingImage="";return image;}
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