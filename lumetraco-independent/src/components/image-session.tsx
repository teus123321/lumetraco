"use client";
import type { VectorDocument, VectorOptions } from "@/lib/types";
import type { ExportStyle, RegionEdits } from "@/lib/vector-editor";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type EditorHistory = { file?: File; sourceDoc?: VectorDocument; options?: VectorOptions; edits: RegionEdits; exportStyle: ExportStyle };
export type EditorDraft = { file: File; sourceDoc: VectorDocument; options: VectorOptions; edits: RegionEdits; exportStyle: ExportStyle; undoStack: EditorHistory[]; redoStack: EditorHistory[] };
type Session = { file: File | null; setFile: (file: File | null) => void; editorDraft: React.RefObject<EditorDraft | null>; saveDraft: (draft: EditorDraft) => Promise<void> };
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

async function readLastSession(): Promise<{file:File|null;draft:EditorDraft|null}> {
  const db=await openImagesDb();
  try { return await new Promise((resolve,reject)=>{
    const tx=db.transaction("images","readonly"),store=tx.objectStore("images");
    const image=store.get("latest"),draft=store.get("draft");
    tx.oncomplete=()=>{const item=image.result as StoredFile|undefined;const saved=draft.result as EditorDraft|undefined;
      const file=item?new File([item.data],item.name,{type:item.type,lastModified:item.lastModified}):null;
      const matching=saved&&file&&saved.file.name===file.name&&saved.file.size===file.size&&saved.file.lastModified===file.lastModified;
      resolve({file,draft:matching?{...saved,file}:null});};tx.onerror=()=>reject(tx.error);
  }); } finally {db.close();}
}
async function persistDraft(draft:EditorDraft) {
  const db=await openImagesDb();
  try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction("images","readwrite");tx.objectStore("images").put(draft,"draft");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
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
  const editorDraft = useRef<EditorDraft | null>(null);
  const [ready,setReady]=useState(false);
  const saveDraft=useCallback(async (draft:EditorDraft)=>{editorDraft.current=draft;await persistDraft(draft);},[]);
  const chosenByUser = useRef(false);
  useEffect(() => {
    let active = true;
    readLastSession().then(saved => {
      if (active && !chosenByUser.current) { editorDraft.current=saved.draft;updateFile(saved.file); }
    }).catch(() => { /* Persistence is optional in private browsing. */ }).finally(()=>{if(active)setReady(true);});
    return () => { active = false; };
  }, []);
  function setFile(next: File | null) {
    chosenByUser.current = true;
    updateFile(next);
    void persistLastImage(next).catch(() => { /* Continue with the in-memory session if storage is full. */ });
  }
  return <ImageContext.Provider value={{ file, setFile, editorDraft, saveDraft }}>{ready ? children : <main className="container" aria-busy="true">Abrindo seu projeto…</main>}</ImageContext.Provider>;
}

export function useImageSession(): Session {
  const value = useContext(ImageContext);
  if (!value) throw new Error("Image session provider missing");
  return value;
}
