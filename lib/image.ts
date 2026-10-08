let pendingImage={base64:"",mimeType:"image/jpeg"};
export function setPendingImage(image:string,mimeType="image/jpeg"){pendingImage={base64:image,mimeType};}
export function takePendingImage(){const image=pendingImage;pendingImage={base64:"",mimeType:"image/jpeg"};return image;}
export async function imageToBase64(uri:string){
 const response=await fetch(uri);const blob=await response.blob();
 const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onloadend=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=reject;reader.readAsDataURL(blob);});
 return {base64,mimeType:blob.type||"image/jpeg"};
}