/**
 * 导出内置静态数据为「种子」文件
 * --------------------------------------------------
 * 用途：让后台管理能管理前台已有的静态内容（文章/说说/友链/画廊相册）。
 * 生成：
 *   - server/seed/*.json      → 本地后端 local-api.cjs require 使用
 *   - functions/seed/*.ts     → 线上 Cloudflare Pages Functions import 使用
 *
 * 用法：node scripts/export-seeds.cjs
 * 静态数据变更（src/data/*.ts）后需重新运行本脚本并提交生成物。
 */
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const TMP = path.join(__dirname, '.tmp-seed')
const SERVER_SEED = path.join(ROOT, 'server', 'seed')
const FUNC_SEED = path.join(ROOT, 'functions', 'seed')

const MODULES = [
  { src: 'src/data/articles.ts', name: 'articles', exportName: 'ARTICLES' },
  { src: 'src/data/shuoshuo.ts', name: 'shuoshuo', exportName: 'SHUOSHUO' },
  { src: 'src/data/friends.ts', name: 'friends', exportName: 'FRIENDS' },
  { src: 'src/data/gallery.ts', name: 'gallery', exportName: 'GALLERY_ALBUMS' },
]

async function main() {
  fs.mkdirSync(TMP, { recursive: true })
  fs.mkdirSync(SERVER_SEED, { recursive: true })
  fs.mkdirSync(FUNC_SEED, { recursive: true })

  for (const m of MODULES) {
    const outfile = path.join(TMP, `${m.name}.cjs`)
    await esbuild.build({
      entryPoints: [path.join(ROOT, m.src)],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      outfile,
      alias: { '@': path.join(ROOT, 'src') },
      logLevel: 'error',
    })
    const mod = require(outfile)
    const data = mod[m.exportName]
    if (!Array.isArray(data)) throw new Error(`${m.name}: 导出 ${m.exportName} 不是数组`)

    // 本地：JSON（CJS require）
    fs.writeFileSync(path.join(SERVER_SEED, `${m.name}.json`), JSON.stringify(data, null, 2))

    // 线上：TS 模块（避免 Pages Functions 对 JSON import 的兼容性问题）
    const ts =
      `// 自动生成，请勿手改！数据源: ${m.src}（由 scripts/export-seeds.cjs 生成）\n` +
      `export const SEED_${m.exportName} = ${JSON.stringify(data)} as any[]\n`
    fs.writeFileSync(path.join(FUNC_SEED, `${m.name}.ts`), ts)

    console.log(`✓ ${m.name}: ${data.length} 条 → server/seed/${m.name}.json + functions/seed/${m.name}.ts`)
  }

  fs.rmSync(TMP, { recursive: true, force: true })
  console.log('种子导出完成。')
}

main().catch((e) => {
  console.error('导出失败:', e)
  process.exit(1)
})
