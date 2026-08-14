// UtDebug polyfill
if (typeof UtDebug === 'undefined') {
  window.UtDebug = { error: console.warn, log: console.log, warn: console.warn };
}

// 注意：live2d_path 参数应使用绝对路径
const live2d_path = '/live2d/';

// 封装异步加载资源的方法
function loadExternalResource(url, type) {
  return new Promise((resolve, reject) => {
    let tag;
    if (type === 'css') {
      tag = document.createElement('link');
      tag.rel = 'stylesheet';
      tag.href = url;
    } else if (type === 'js') {
      tag = document.createElement('script');
      tag.src = url;
    }
    if (tag) {
      tag.onload = () => resolve(url);
      tag.onerror = () => reject(url);
      document.head.appendChild(tag);
    }
  });
}

// 设置默认模型为 kp31 (index 0)
// 版本号 v6：强制重置旧的 localStorage 缓存，确保新访客和老访客都看到 kp31
if (!localStorage.getItem("modelId_v6")) {
  localStorage.setItem("modelId", "0");
  localStorage.setItem("modelTexturesId", "0");
  localStorage.setItem("modelId_v6", "1");
}

// 加载 waifu.css live2d.min.js waifu-tips.js
if (screen.width >= 768) {
  Promise.all([
    loadExternalResource(live2d_path + 'css/right.css', 'css'),
    loadExternalResource(live2d_path + 'live2d.min.js', 'js'),
    loadExternalResource(live2d_path + 'jsdelivr/random/waifu-tips.js?v=6', 'js'),
  ]).then(() => {
    // 配置选项的具体用法见 README.md
    initWidget({
      waifuPath: live2d_path + 'waifu-tips.json',

      // apiPath: "https://live2d.fghrsh.net/api/",
      cdnPath: live2d_path,

      tools: [
        'hitokoto',
        'asteroids',
        'switch-model',
        'switch-texture',
        'photo',
        'info',
        'quit',
      ],
    });
  });
}

console.log(`
  く__,.ヘヽ.        /  ,ー､ 〉
           ＼ ', !-─‐-i  /  /´
           ／｀ｰ'       L/／｀ヽ､
         /   ／,   /|   ,   ,       ',
       ｲ   / /-‐/  ｉ  L_ ﾊ ヽ!   i
        ﾚ ﾍ 7ｲ｀ﾄ   ﾚ'ｧ-ﾄ､!ハ|   |
          !,/7 '0'     ´0iソ|    |
          |.从"    _     ,,,, / |./    |
          ﾚ'| i＞.､,,__  _,.イ /   .i   |
            ﾚ'| | / k_７_/ﾚ'ヽ,  ﾊ.  |
              | |/i 〈|/   i  ,.ﾍ |  i  |
             .|/ /  ｉ：    ﾍ!    ＼  |
              kヽ>､ﾊ    _,.ﾍ､    /､!
              !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
              ﾚ'ヽL__|___i,___,ンﾚ|ノ
                  ﾄ-,/  |___./
                  'ｰ'    !_,.:
`);
