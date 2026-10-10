type PendingImage={base64:string;mimeType:string};
let pendingImages:PendingImage[]=[];
export function setPendingImages(images:PendingImage[]){pendingImages=images.filter(image=>!!image.base64);}
export function setPendingImage(image:string,mimeType="image/jpeg"){pendingImages=[{base64:image,mimeType}];}
export function takePendingImages(){const images=pendingImages;pendingImages=[];return images;}
export function takePendingImage(){const image=takePendingImages()[0]||{base64:"",mimeType:"image/jpeg"};return image;}
export async function imageToBase64(uri:string){
 const response=await fetch(uri);const blob=await response.blob();
 const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onloadend=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=reject;reader.readAsDataURL(blob);});
 return {base64,mimeType:blob.type||"image/jpeg"};
}