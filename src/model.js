import { lessons } from "./content.js";
export const normalize = (s) =>
  String(s)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s·.,/()[\]—–:-]/g, "");
export function searchableText(lesson) {
  return [
    lesson.title,
    lesson.summary,
    lesson.chapterTitle,
    ...lesson.tags,
    ...lesson.blocks.flatMap((b) => [
      b.title,
      b.text,
      ...(b.items || []).flat(),
      ...(b.headers || []),
      ...(b.rows || []).flat(),
      b.kind,
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}
export function searchLessons(query) {
  const words = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  if (!words.length) return [];
  return lessons
    .map((l) => {
      const all = normalize(searchableText(l));
      const title = normalize(l.title),
        tags = normalize(l.tags.join(" "));
      if (!words.every((word) => all.includes(word))) return null;
      return {
        ...l,
        score: words.reduce(
          (n, w) =>
            n +
            (title.includes(w) ? 12 : 0) +
            (tags.includes(w) ? 5 : 0) +
            (normalize(l.summary).includes(w) ? 3 : 0) +
            1,
          0,
        ),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
export function travelCost({ days, nights, transport, hotel }) {
  const errors = {};
  const values = { days, nights, transport, hotel };
  for (const k of ["days", "nights", "transport"])
    if (
      String(values[k]).trim() === "" ||
      !Number.isSafeInteger(Number(values[k])) ||
      Number(values[k]) < (k === "days" ? 1 : 0)
    )
      errors[k] =
        k === "days"
          ? "1 이상의 정수를 입력하세요."
          : "0 이상의 정수를 입력하세요.";
  if (
    Number(nights) > 0 &&
    (String(hotel).trim() === "" ||
      !Number.isSafeInteger(Number(hotel)) ||
      Number(hotel) < 0)
  )
    errors.hotel = "숙박이 있으면 1박 숙박비를 0 이상의 정수로 입력하세요.";
  if (Object.keys(errors).length) return { errors };
  const daily = Number(days) * 20000,
    lodging = Number(nights) * Math.min(Number(hotel) || 0, 70000),
    total = daily + lodging + Number(transport);
  if (!Number.isSafeInteger(total))
    return { errors: { days: "계산 범위를 초과했습니다. 값을 줄여 주세요." } };
  return {
    daily,
    lodging,
    transport: Number(transport),
    total,
    exceeded: Number(nights) > 0 && Number(hotel) > 70000,
    errors: {},
  };
}
export const difficulty = {
  easy: { interval: 1500, visible: 1200 },
  normal: { interval: 1000, visible: 800 },
  hard: { interval: 650, visible: 450 },
};
export const successRate = (hits, clicks) =>
  clicks ? Math.round((hits / clicks) * 100) : 0;
export function nextHole(previous, random = Math.random) {
  const offset = Math.min(7, Math.floor(random() * 8));
  if (previous < 0) return Math.min(8, Math.floor(random() * 9));
  return offset >= previous ? offset + 1 : offset;
}
