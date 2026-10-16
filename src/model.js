export const event = {
  title: "제16회 안산읍성문화예술제",
  date: "2026. 10. 17. 토요일",
  time: "11:00 — 17:00",
  place: "안산읍성 일원",
  route: "안산초교 → 안산읍성",
};
export const programs = [
  {
    id: "parade",
    type: "재현",
    time: "11:00—11:40",
    start: "11:00",
    end: "11:40",
    title: "정조대왕 능행차 공동재현",
    place: "안산초교 → 안산읍성",
    tag: "대표 프로그램",
    description:
      "정조대왕의 발자취를 따라, 안산의 길 위에 역사가 다시 펼쳐집니다. 행렬을 따라 이어지는 축제의 시작을 만나보세요.",
  },
  {
    id: "opening",
    type: "공연",
    time: "11:40—12:20",
    start: "11:40",
    end: "12:20",
    title: "개막식",
    place: "행사장",
    tag: "함께 여는 축제",
    description:
      "제16회 안산읍성문화예술제의 시작을 함께하는 시간입니다. 전통의 멋과 오늘의 설렘이 한자리에 모입니다.",
  },
  {
    id: "busking",
    type: "공연",
    time: "13:00—13:40",
    start: "13:00",
    end: "13:40",
    title: "가을빛 버스킹",
    place: "전시관 앞",
    tag: "가을의 선율",
    description:
      "전시관 앞에 잠시 머물러 가을의 선율을 즐겨보세요. 일상의 풍경에 음악이 더해집니다.",
  },
  {
    id: "concert",
    type: "공연",
    time: "14:00—17:00",
    start: "14:00",
    end: "17:00",
    title: "천년안산 음악회",
    place: "행사장",
    tag: "오후의 하이라이트",
    description:
      "반가운 출연진과 함께하는 가을 오후의 음악회. 세대를 잇는 노래로 축제의 여운을 나눕니다.",
  },
  {
    id: "community",
    type: "참여·체험",
    time: "11:00—13:00",
    start: "11:00",
    end: "13:00",
    title: "안산동 경로잔치",
    place: "행사장",
    tag: "이웃과 함께",
    description: "마을의 어르신과 이웃이 함께하는 정겨운 시간입니다.",
  },
  {
    id: "culture",
    type: "참여·체험",
    time: "11:00—17:00",
    start: "11:00",
    end: "17:00",
    title: "문화체험 한마당",
    place: "행사장",
    tag: "손끝으로 만나는 문화",
    description:
      "가족, 친구와 함께 우리 문화를 가까이 느껴보세요. 구체적인 체험 종류와 운영 방식은 시연을 위한 안내로 별도 확정되지 않았습니다.",
  },
  {
    id: "drawing",
    type: "참여·체험",
    time: "11:00—17:00",
    start: "11:00",
    end: "17:00",
    title: "다함께 수암마을 그리기",
    place: "행사장",
    tag: "우리 마을의 색",
    description:
      "각자의 시선으로 바라본 수암마을을 그림으로 남겨보는 시간입니다.",
  },
  {
    id: "ras",
    type: "참여·체험",
    time: "11:00—17:00",
    start: "11:00",
    end: "17:00",
    title: "안산읍성 RAS",
    place: "안산읍성 일원",
    tag: "읽고, 담고, 걷다",
    description:
      "가을을 읽고, 추억을 담고, 역사를 걷는 시간. 포스터에 소개된 안산읍성 RAS 프로그램입니다. 세부 참여 방식은 제공 자료에 없어 확정 안내하지 않습니다.",
  },
];
export function filterPrograms(type) {
  return type === "전체" ? programs : programs.filter((p) => p.type === type);
}
export function calendarFile() {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ansan Festival Demo//KO",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:ansan-festival-20261017@demo.local",
      "DTSTAMP:20261001T000000Z",
      "DTSTART:20261017T020000Z",
      "DTEND:20261017T080000Z",
      "SUMMARY:제16회 안산읍성문화예술제",
      "LOCATION:안산읍성 일원",
      "DESCRIPTION:포스터 기반 행사 소개 시연 사이트입니다. 실제 방문 전 주최 측 공지를 확인하세요.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}
