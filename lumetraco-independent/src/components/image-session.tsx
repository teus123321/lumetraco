"use client";
import { createContext, useContext, useState } from "react";
type Session = { file: File | null; setFile: (file: File | null) => void };
const ImageContext = createContext<Session | null>(null);
export function ImageSessionProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  return <ImageContext.Provider value={{ file, setFile }}>{children}</ImageContext.Provider>;
}
export function useImageSession(): Session {
  const value = useContext(ImageContext);
  if (!value) throw new Error("Image session provider missing");
  return value;
}
