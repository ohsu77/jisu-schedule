// Unit-test adjacent-month assignment. Run: npx tsx scripts/month_test.ts
import { assignMonths } from '../src/lib/extractSchedule'

const ym = (y: number, m: number) => `${y}-${m}`

interface Case {
  name: string
  nums: number[]
  anchor: [number, number]   // [year, month]
  expect: string[]           // expected "y-m" per row
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

const cases: Case[] = [
  {
    name: '전부 같은 달 (6월)',
    nums: range(1, 30),
    anchor: [2026, 6],
    expect: range(1, 30).map(() => ym(2026, 6)),
  },
  {
    name: '전달 말일 spillover (5/29,30 + 6월)',
    nums: [29, 30, ...range(1, 30)],
    anchor: [2026, 6],
    expect: [ym(2026, 5), ym(2026, 5), ...range(1, 30).map(() => ym(2026, 6))],
  },
  {
    name: '익월 spillover (6월 + 7/1,2)',
    nums: [...range(1, 30), 1, 2],
    anchor: [2026, 6],
    expect: [...range(1, 30).map(() => ym(2026, 6)), ym(2026, 7), ym(2026, 7)],
  },
  {
    name: '연초 경계 (작년 12월 spillover -> 1월)',
    nums: [30, 31, ...range(1, 31)],
    anchor: [2026, 1],
    expect: [ym(2025, 12), ym(2025, 12), ...range(1, 31).map(() => ym(2026, 1))],
  },
  {
    name: '연말 경계 (12월 + 내년 1/1,2)',
    nums: [...range(1, 31), 1, 2],
    anchor: [2026, 12],
    expect: [...range(1, 31).map(() => ym(2026, 12)), ym(2027, 1), ym(2027, 1)],
  },
]

let ok = true
for (const c of cases) {
  const got = assignMonths(c.nums, c.anchor[0], c.anchor[1]).map((r) => ym(r.year, r.month))
  const pass = got.length === c.expect.length && got.every((g, i) => g === c.expect[i])
  console.log(`${pass ? '✅' : '❌'} ${c.name}`)
  if (!pass) {
    ok = false
    console.log('   nums  :', c.nums.join(','))
    console.log('   expect:', c.expect.join(' '))
    console.log('   got   :', got.join(' '))
  }
}
process.exit(ok ? 0 : 1)
