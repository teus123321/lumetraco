"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type Session = { file: File | null; setFile: (file: File | null) => void };
type StoredFile = { name: string; type: string; data: Blob; lastModified: number };
const ImageContext = createContext<Session | null>(null);

function openImagesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB indisponível")); return; }
    const request = indexedDB.open("lumetraco-local", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("images")) db.createObjectStore("images");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readLastImage(): Promise<File | null> {
  const db = await openImagesDb();
  try {
    const item = await new Promise<StoredFile | undefined>((resolve, reject) => {
      const request = db.transaction("images", "readonly").objectStore("images").get("latest");
      request.onsuccess = () => resolve(request.result as StoredFile | undefined);
      request.onerror = () => reject(request.error);
    });
    return item ? new File([item.data], item.name, { type: item.type, lastModified: item.lastModified }) : null;
  } finally { db.close(); }
}

async function persistLastImage(file: File | null): Promise<void> {
  const db = await openImagesDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("images", "readwrite");
      const store = transaction.objectStore("images");
      if (file) store.put({ name: file.name, type: file.type, data: file, lastModified: file.lastModified } satisfies StoredFile, "latest");
      else store.delete("latest");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export function ImageSessionProvider({ children }: { children: React.ReactNode }) {
  const [file, updateFile] = useState<File | null>(null);
  const chosenByUser = useRef(false);
  useEffect(() => {
    let active = true;
    readLastImage().then(saved => {
      if (active && !chosenByUser.current && saved) updateFile(saved);
    }).catch(() => { /* Persistence is optional in private browsing. */ });
    return () => { active = false; };
  }, []);
  function setFile(next: File | null) {
    chosenByUser.current = true;
    updateFile(next);
    void persistLastImage(next).catch(() => { /* Continue with the in-memory session if storage is full. */ });
  }
  return <ImageContext.Provider value={{ file, setFile }}>{children}</ImageContext.Provider>;
}

export function useImageSession(): Session {
  const value = useContext(ImageContext);
  if (!value) throw new Error("Image session provider missing");
  return value;
}
