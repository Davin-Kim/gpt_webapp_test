export const defaultMenus = [
  "김치찌개",
  "돈까스",
  "비빔밥",
  "제육볶음",
  "쌀국수",
  "초밥",
  "칼국수",
  "햄버거",
  "샐러드",
  "순두부찌개",
];
export function normalizeMenu(value) {
  return value.trim().replace(/\s+/g, " ");
}
export function addMenu(menus, value) {
  const name = normalizeMenu(value);
  if (!name) throw Error("추가할 메뉴 이름을 입력해 주세요.");
  if (name.length > 40) throw Error("메뉴 이름은 40자 이내로 입력해 주세요.");
  if (
    menus.some((menu) => menu.toLocaleLowerCase() === name.toLocaleLowerCase())
  )
    throw Error("이미 있는 메뉴예요. 다른 메뉴를 추가해 주세요.");
  return [...menus, name];
}
export function chooseMenu(menus, previous = "", random = crypto) {
  const candidates =
    menus.length > 1 ? menus.filter((menu) => menu !== previous) : menus;
  if (!candidates.length) return null;
  const limit = Math.floor(4294967296 / candidates.length) * candidates.length;
  const values = new Uint32Array(1);
  do {
    random.getRandomValues(values);
  } while (values[0] >= limit);
  return candidates[values[0] % candidates.length];
}
