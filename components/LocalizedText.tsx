import React from "react";
import { Text as NativeText, TextInput as NativeTextInput } from "react-native";
import type { TextProps, TextInputProps } from "react-native";
import { translateUiText, useLanguage } from "../lib/language";

function localize(value:string,language:Parameters<typeof translateUiText>[1]){
 return translateUiText(value,language);
}
function translateChildren(children:React.ReactNode,language:Parameters<typeof translateUiText>[1]):React.ReactNode{
 if(typeof children==="string")return localize(children,language);
 if(typeof children==="number"||children===null||children===undefined||typeof children==="boolean")return children;
 if(Array.isArray(children))return children.map((child,index)=><React.Fragment key={index}>{translateChildren(child,language)}</React.Fragment>);
 if(React.isValidElement(children)){
  if(children.type===NativeText)return React.cloneElement(children as React.ReactElement<any>,{},translateChildren((children.props as any).children,language));
  return children;
 }
 return children;
}
export function LocalizedText(props:TextProps){
 const {language}=useLanguage();
 return <NativeText {...props}>{translateChildren(props.children,language)}</NativeText>;
}
export function LocalizedTextInput(props:TextInputProps){
 const {language}=useLanguage();
 const placeholder=props.placeholder?localize(props.placeholder,language):props.placeholder;
 const accessibilityLabel=props.accessibilityLabel?localize(props.accessibilityLabel,language):props.accessibilityLabel;
 return <NativeTextInput {...props} placeholder={placeholder} accessibilityLabel={accessibilityLabel}/>;
}
