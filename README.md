# 지수 스케줄

근무표 PDF를 올리면 **내 이니셜의 일정만** 뽑아 예쁜 월간 달력으로 보여주고,
**사진첩 이미지**나 **캘린더(.ics)** 로 내보내는 모바일 우선 PWA.

- 🧠 **AI 없음 · 서버 없음 · API 키 없음** — PDF를 브라우저 안에서 좌표 기반으로 결정론적 파싱
- 🔒 PDF가 기기 밖으로 나가지 않음 (동료 이름이 든 근무표라 프라이버시 안전)
- 💸 완전 정적 배포 가능 (무료)

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 정적 빌드
```

## 동작 흐름

1. **내 이니셜** 설정 (예: `JP`) — localStorage에 저장
2. **근무표 PDF 업로드** → `pdfjs-dist`가 글자 좌표 추출
3. 좌표 기반 파서가 해당 이니셜의 일별 **근무/역할/서브/휴무** 추출 (`src/lib/extractSchedule.ts`)
4. 예쁜 달력으로 표시 + **표로 보기·수정**(확인/교정)
5. **📷 사진첩 저장**(html-to-image + Web Share) / **📅 .ics**(종일 이벤트)

## 구조

```
src/lib/
  schedule.ts        도메인 타입 · 역할 색상
  extractSchedule.ts 순수 파서(좌표→일정) + 월/연 감지   ← 핵심, 테스트 대상
  pdfTokens.ts       브라우저 pdfjs 어댑터
  parse.ts           PDF → ParsedSchedule
  ics.ts             .ics(종일) 생성
  download.ts        PNG 저장/공유 · 파일 다운로드
src/components/       Uploader · SettingsBar · CalendarView · ReviewTable · ExportBar
scripts/
  parse_demo.py      파이썬 기준 파서(검증 기준)
  verify.py          전체 역할 그리드 덤프(교차검증)
  parse_test.ts      pdfjs 파서가 파이썬과 일치하는지 검증
  ics_test.ts        .ics 출력 점검
samples/             테스트용 근무표 PDF
```

## 검증

- `npx tsx scripts/parse_test.ts` — pdfjs 파서 결과가 파이썬과 동일(JP 6월: 근무 22·휴무 8)
- `npx tsx scripts/ics_test.ts` — 22개 종일 VEVENT 생성 확인

## 알려진 단순화

- 근무 시간은 다루지 않음(항상 동일) → **종일 이벤트**로 처리
- 본인 vac/sick은 "휴무"로 표기(휴가/병가 구분 안 함)
- 1페이지 월간 근무표(Google Sheets 내보내기 포맷) 기준
