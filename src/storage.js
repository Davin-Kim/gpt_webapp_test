const NAME = "munseoon-documents";
function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error("다른 탭에서 저장소를 사용 중입니다."));
  });
}
export async function loadDraft() {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts"),
      r = tx.objectStore("drafts").get("current");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveDraft(doc) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(doc, "current");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error || Error("임시 저장 실패"));
    };
  });
}
