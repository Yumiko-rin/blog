@echo off
chcp 65001 >nul
setlocal

:: ============================================================
::  博客一键部署脚本 (bob)
::  双击即可运行：拉取 -> 提交 -> 推送(触发 CF 自动部署) -> 清 KV
:: ============================================================

:: 切换到脚本所在目录（博客根目录）
cd /d "%~dp0"

echo ============================================
echo   博客一键部署 (bob)
echo ============================================

:: ---------- 0. 准备 git 凭据与身份 ----------
:: 全局 gitconfig 里有一个指向不存在 exe 的坏 credential.helper，会让普通
:: git push 卡死；同时身份(user.name/email)也存在 global 中。这里用临时
:: config 只保留 wincred + 身份信息，绕过坏配置（提交需要身份）。
for /f "tokens=*" %%i in ('git config --global user.name 2^>nul') do set "UNAME=%%i"
for /f "tokens=*" %%i in ('git config --global user.email 2^>nul') do set "UEMAIL=%%i"

set "GITCFG=%TEMP%\bob_deploy_gitcfg.tmp"
(
  echo [credential]
  echo helper=wincred
  echo [user]
  echo name=%UNAME%
  echo email=%UEMAIL%
) > "%GITCFG%"
set GIT_CONFIG_GLOBAL=%GITCFG%

:: ---------- 1. 拉取远端（快进合并，避免冲突） ----------
echo.
echo [1/4] 拉取 GitHub 最新代码...
git pull --ff-only origin main
if errorlevel 1 (
  echo [警告] 拉取失败（可能本地有冲突或网络问题），仍尝试推送...
)

:: ---------- 2. 提交本地改动（dev/ 已被 .gitignore 排除） ----------
echo.
echo [2/4] 提交本地改动...
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "auto deploy %date% %time%"
  echo 已提交本地改动。
) else (
  echo 没有需要提交的改动。
)

:: ---------- 3. 推送到 GitHub（触发 Cloudflare Pages 自动部署） ----------
echo.
echo [3/4] 推送到 GitHub（触发 CF 自动构建部署）...
git push origin main
if errorlevel 1 (
  echo [错误] 推送失败，请检查网络或凭据。脚本终止。
  goto :cleanup
)
echo 推送成功！Cloudflare 正在自动构建部署...

:: ---------- 4. 清空线上 KV 旧键（需本机 wrangler 已登录） ----------
echo.
echo [4/4] 清空线上 KV 旧键（admin_*）...
for %%k in (admin_articles admin_shuoshuo admin_friends admin_gallery) do (
  echo 删除 KV 键: %%k
  npx wrangler kv key delete --binding=COMMENTS_KV "%%k" 2>nul
)
echo KV 清理完成（若 wrangler 未登录会报错，可稍后在 CF 控制台手动删除这 4 个键）。

echo.
echo ============================================
echo   部署已触发！
echo   1. 打开 Cloudflare 控制台 -> Workers^&Pages -> bob -> Deployments 查看进度
echo   2. 部署完成后访问后台，新种子会自动写入 KV（ensureSeed 哈希比对）
echo   3. 浏览器 Ctrl+F5 强制刷新
echo ============================================
goto :cleanup

:cleanup
if exist "%GITCFG%" del /q "%GITCFG%"
echo.
echo 按任意键退出...
pause >nul
