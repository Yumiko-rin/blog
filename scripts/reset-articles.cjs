// 一次性脚本：重置文章数据 —— 日期全部改为今天(2026-08-13)，浏览量/点赞归零，
// 阅读时长按 wordCount / 300 字每分钟重算（中文标准阅读速度）。
const fs = require('fs')
const path = require('path')

const file = path.resolve(__dirname, '..', 'src', 'data', 'articles.ts')
let src = fs.readFileSync(file, 'utf8')
const TODAY = '2026-08-13'

// 每篇字段顺序固定：date → views → likes → readingTime → isPinned → wordCount
const RE =
  /(    date: ")(\d{4}-\d{2}-\d{2})(",)(\n    views: )(\d+)(,)(\n    likes: )(\d+)(,)(\n    readingTime: )(\d+)(,)(\n    isPinned: )(\w+)(,)(\n    wordCount: )(\d+)(,)/g

let count = 0
src = src.replace(RE, (...m) => {
  const wordCount = Number(m[17])
  const readingTime = Math.max(1, Math.ceil(wordCount / 300))
  count++
  return `${m[1]}${TODAY}${m[3]}${m[4]}0${m[6]}${m[7]}0${m[9]}${m[10]}${readingTime}${m[12]}${m[13]}${m[14]}${m[15]}${m[16]}${m[17]}${m[18]}`
})

if (count === 0) {
  console.error('ERROR: no article blocks matched!')
  process.exit(1)
}
fs.writeFileSync(file, src, 'utf8')
console.log(`OK: ${count} articles reset (date=${TODAY}, views=0, likes=0, readingTime recalculated)`)
