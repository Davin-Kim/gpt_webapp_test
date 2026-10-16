const KEY = "lunch-picker.menus.v1";
export function loadMenus() {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return null;
  const menus = JSON.parse(raw);
  if (
    !Array.isArray(menus) ||
    menus.some((m) => typeof m !== "string" || !m.trim() || m.length > 40) ||
    new Set(menus).size !== menus.length
  )
    throw Error("저장된 메뉴 형식을 읽을 수 없습니다.");
  return menus;
}
export function saveMenus(menus) {
  localStorage.setItem(KEY, JSON.stringify(menus));
}
