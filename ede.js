// ==UserScript==
// @name         Emby danmaku extension
// @description  Emby弹幕插件 (基于RyoLee的emby-danmaku和chen3861229的dd-danmaku项目修改)
// @author       RyoLee - Modified by hiback (Forked and modified by kutongling)
// @version      1.0.11
// @copyright    2022, RyoLee (https://github.com/RyoLee), chen3861229 (https://github.com/chen3861229/dd-danmaku) - Modified by kutongling (https://github.com/kutongling)
// @license      MIT
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @grant        none
// @match        */web/index.html
// ==/UserScript==

(async function() {
  'use strict';
  // ------ configs start------
  const check_interval = 200;
  const chConverTtitle = ['当前状态: 未启用', '当前状态: 转换为简体', '当前状态: 转换为繁体'];

  //图标常量
  // 0:当前状态关闭 1:当前状态打开
  const danmaku_icons = ['\uE7A2', '\uE0B9'];
  const search_icon = '\uE881';
  const translate_icon = '\uE927';
  const filter_icons = ['\uE3E0', '\uE3D0', '\uE3D1', '\uE3D2'];
  const transparency_icons = ['\uEBDC', '\uEBD9', '\uEBE0', '\uEBE2', '\uEBE2', '\uEBD4', '\uEBD2', '\uE1A4'];
  const info_switch_icons = ['\uE8F5', '\uE8F4']; // 关闭/显示
  const more_filter_icon = '\uE5D3'; // 更多过滤图标

  //通用参数常量
  const menubarOptions = {
    class: 'flex flex-direction-row',
  };
  const buttonOptions = {
    class: 'paper-icon-button-light',
    is: 'paper-icon-button-light',
  };
  const rangeSliderOptions = {
    class: 'emby-slider emby-slider-scalebg emby-slider-nothumb',
    is: 'emby-slider',
  };
  const sliderContainerOptions = {
    class: 'slidercontainer flex-grow emby-slider-container',
  };
  const sliderWrapperOptions = {
    class: 'videoOsdVolumeSliderWrapper flex-grow',
  };
  const sliderdivOptions = {
    class: 'videoOsdVolumeControls flex flex-direction-row align-items-center',
    style: 'position:relative;',
  };

  //定位标志常量
  const uiAnchorStr = '\uE034';
  const mediaContainerQueryStr = 'div[class~="view-videoosd-videoosd"]';
  const mediaQueryStr = 'video';

  //全局透明度/移动端检测flag
  var globalOpacity = 1.0;
  var isMobile = false;
  //字体大小（桌面/移动）
  const fontSizeDesktop = 25;
  const fontSizeMobile = 15;
  //移动设备检测
  if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    isMobile = true;
  }

  //各个控件差异化参数常量
  const displayButtonOpts = {
    title: '弹幕开关/透明度调整',
    id: 'displayDanmaku',
    innerText: null,
    onclick: () => {
      if (window.ede.loading) {
        console.log('正在加载,请稍后再试');
        return;
      }
      console.log('切换弹幕开关');
      window.ede.danmakuSwitch = (window.ede.danmakuSwitch + 1) % 2;
      window.localStorage.setItem('danmakuSwitch', window.ede.danmakuSwitch);
      document.querySelector('#displayDanmaku').children[0].innerText = danmaku_icons[window.ede.danmakuSwitch];
      if (window.ede.danmaku) {
        window.ede.danmakuSwitch == 1 ? window.ede.danmaku.show() : window.ede.danmaku.hide();
      }
    },
  };
  const searchButtonOpts = {
    title: '搜索弹幕',
    id: 'searchDanmaku',
    innerText: search_icon,
    onclick: () => {
      if (window.ede.loading) {
        console.log('正在加载,请稍后再试');
        return;
      }
      console.log('手动匹配弹幕');
      showSearchDialog();
    },
  };
  const translateButtonOpts = {
    title: null,
    id: 'translateDanmaku',
    innerText: translate_icon,
    onclick: () => {
      if (window.ede.loading) {
        console.log('正在加载,请稍后再试');
        return;
      }
      console.log('切换简繁转换');
      window.ede.chConvert = (window.ede.chConvert + 1) % 3;
      window.localStorage.setItem('chConvert', window.ede.chConvert);
      document.querySelector('#translateDanmaku').setAttribute('title', chConverTtitle[window.ede.chConvert]);
      reloadDanmaku('reload');
      console.log(document.querySelector('#translateDanmaku').getAttribute('title'));
    },
  };
  const filterButtonOpts = {
    title: '过滤等级(立即生效)', 
    id: 'filteringDanmaku',
    innerText: null,
    onclick: () => {
      console.log('切换弹幕过滤等级');
      let level = window.localStorage.getItem('danmakuFilterLevel');
      level = ((level ? parseInt(level) : 0) + 1) % 4;
      window.localStorage.setItem('danmakuFilterLevel', level);
      document.querySelector('#filteringDanmaku').children[0].innerText = filter_icons[level];
      // 添加立即重载弹幕
      reloadDanmaku('reload');
    },
  };
  const transparencyRangeSliderOpts = {
    type: 'range',
    step: '1',
    min: '0',
    max: '100',
    value: '100',
    oninput: function() {
      window.localStorage.setItem('danmakuTransparencyLevel', this.value);
      globalOpacity = this.value / 100;
    },
  };
  const infoSwitchButtonOpts = {
    title: '弹幕信息显示',
    id: 'switchDanmakuInfo',
    innerText: null,
    onclick: () => {
      console.log('切换弹幕信息显示');
      window.ede.showDanmakuInfo = !window.ede.showDanmakuInfo;
      window.localStorage.setItem('showDanmakuInfo', window.ede.showDanmakuInfo);
      document.querySelector('#switchDanmakuInfo').children[0].innerText = info_switch_icons[window.ede.showDanmakuInfo ? 1 : 0];
      const infoElement = document.getElementById('videoOsdDanmakuTitle');
      if (infoElement) {
        infoElement.style.display = window.ede.showDanmakuInfo ? 'block' : 'none';
      }
    },
  };
  const danmakuTypeFilterOpts = {
    bottom: { id: 'bottom', name: '底部弹幕', },
    top: { id: 'top', name: '顶部弹幕', },
    rolling: { id: 'rolling', name: '滚动弹幕', }, // 滚动弹幕选项包含了 ltr 和 rtl
    onlyWhite: { id: 'onlyWhite', name: '彩色弹幕', },
    emoji: { id: 'emoji', name: 'emoji', },
  };
  const moreFilterButtonOpts = {
    title: '更多过滤选项',
    id: 'moreFilteringDanmaku',
    innerText: more_filter_icon,
    onclick: () => {
        console.log('显示更多过滤选项');
        showFilterDialog();
    },
  };

  // ------ configs end------
  /* eslint-disable */
  /* https://cdn.jsdelivr.net/npm/danmaku/dist/danmaku.canvas.min.js */
  // 替换其中"render:function(t,e){t.context.drawImage(e.canvas,e.x*n,e.y*n)}"为"render:function(t,e){t.context.globalAlpha=globalOpacity,t.context.drawImage(e.canvas,e.x*n,e.y*n)}"
  // prettier-ignore
  !function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).Danmaku=e()}(this,(function(){"use strict";var t=function(){for(var t=["oTransform","msTransform","mozTransform","webkitTransform","transform"],e=document.createElement("div").style,i=0;i<t.length;i++)if(t[i]in e)return t[i];return"transform"}();function e(t){var e=document.createElement("div");if(e.style.cssText="position:absolute;","function"==typeof t.render){var i=t.render();if(i instanceof HTMLElement)return e.appendChild(i),e}if(e.textContent=t.text,t.style)for(var n in t.style)e.style[n]=t.style[n];return e}var i={name:"dom",init:function(){var t=document.createElement("div");return t.style.cssText="overflow:hidden;white-space:nowrap;transform:translateZ(0);",t},clear:function(t){for(var e=t.lastChild;e;)t.removeChild(e),e=t.lastChild},resize:function(t,e,i){t.style.width=e+"px",t.style.height=i+"px"},framing:function(){},setup:function(t,i){var n=document.createDocumentFragment(),s=0,r=null;for(s=0;s<i.length;s++)(r=i[s]).node=r.node||e(r),n.appendChild(r.node);for(i.length&&t.appendChild(n),s=0;s<i.length;s++)(r=i[s]).width=r.width||r.node.offsetWidth,r.height=r.height||r.node.offsetHeight},render:function(e,i){i.node.style[t]="translate("+i.x+"px,"+i.y+"px)"},remove:function(t,e){t.removeChild(e.node),this.media||(e.node=null)}};const n=window.devicePixelRatio||1;var s=Object.create(null);function r(t,e){if("function"==typeof t.render){var i=t.render();if(i instanceof HTMLCanvasElement)return t.width=i.width,t.height=i.height,i}var r=document.createElement("canvas"),h=r.getContext("2d"),o=t.style||{};o.font=o.font||"10px sans-serif",o.textBaseline=o.textBaseline||"bottom";var a=1*o.lineWidth;for(var d in a=a>0&&a!==1/0?Math.ceil(a):1*!!o.strokeStyle,h.font=o.font,t.width=t.width||Math.max(1,Math.ceil(h.measureText(t.text).width)+2*a),t.height=t.height||Math.ceil(function(t,e){if(s[t])return s[t];var i=12,n=t.match(/(\d+(?:\.\d+)?)(px|%|em|rem)(?:\s*\/\s*(\d+(?:\.\d+)?)(px|%|em|rem)?)?/);if(n){var r=1*n[1]||10,h=n[2],o=1*n[3]||1.2,a=n[4];"%"===h&&(r*=e.container/100),"em"===h&&(r*=e.container),"rem"===h&&(r*=e.root),"px"===a&&(i=o),"%"===a&&(i=r*o/100),"em"===a&&(i=r*o),"rem"===a&&(i=e.root*o),void 0===a&&(i=r*o)}return s[t]=i,i}(o.font,e))+2*a,r.width=t.width*n,r.height=t.height*n,h.scale(n,n),o)h[d]=o[d];var u=0;switch(o.textBaseline){case"top":case"hanging":u=a;break;case"middle":u=t.height>>1;break;default:u=t.height-a}return o.strokeStyle&&h.strokeText(t.text,a,u),h.fillText(t.text,a,u),r}function h(t){return 1*window.getComputedStyle(t,null).getPropertyValue("font-size").match(/(.+)px/)[1]}var o={name:"canvas",init:function(t){var e=document.createElement("canvas");return e.context=e.getContext("2d"),e._fontSize={root:h(document.getElementsByTagName("html")[0]),container:h(t)},e},clear:function(t,e){t.context.clearRect(0,0,t.width,t.height);for(var i=0;i<e.length;i++)e[i].canvas=null},resize:function(t,e,i){t.width=e*n,t.height=i*n,t.style.width=e+"px",t.style.height=i+"px"},framing:function(t){t.context.clearRect(0,0,t.width,t.height)},setup:function(t,e){for(var i=0;i<e.length;i++){var n=e[i];n.canvas=r(n,t._fontSize)}},render:function(t,e){t.context.globalAlpha=globalOpacity,t.context.drawImage(e.canvas,e.x*n,e.y*n)},remove:function(t,e){e.canvas=null}};function a(t){var e=this,i=this.media?this.media.currentTime:Date.now()/1e3,n=this.media?this.media.playbackRate:1;function s(t,s){if("top"===s.mode||"bottom"===s.mode)return i-t.time<e._.duration;var r=(e._.width+t.width)*(i-t.time)*n/e._.duration;if(t.width>r)return!0;var h=e._.duration+t.time-i,o=e._.width+s.width,a=e.media?s.time:s._utc,d=o*(i-a)*n/e._.duration,u=e._.width-d;return h>e._.duration*u/(e._.width+s.width)}for(var r=this._.space[t.mode],h=0,o=0,a=1;a<r.length;a++){var d=r[a],u=t.height;if("top"!==t.mode&&"bottom"!==t.mode||(u+=d.height),d.range-d.height-r[h].range>=u){o=a;break}s(d,t)&&(h=a)}var m=r[h].range,c={range:m+t.height,time:this.media?t.time:t._utc,width:t.width,height:t.height};return r.splice(h+1,o-h-1,c),"bottom"===t.mode?this._.height-t.height-m%this._.height:m%(this._.height-t.height)}var d=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||function(t){return setTimeout(t,50/3)},u=window.cancelAnimationFrame||window.mozCancelAnimationFrame||window.webkitCancelAnimationFrame||clearTimeout;function m(t,e,i){for(var n=0,s=0,r=t.length;s<r-1;)i>=t[n=s+r>>1][e]?s=n:r=n;return t[s]&&i<t[s][e]?s:r}function c(t){return/^(ltr|top|bottom)$/i.test(t)?t.toLowerCase():"rtl"}function l(){var t=9007199254740991;return[{range:0,time:-t,width:t,height:0},{range:t,time:t,width:0,height:0}]}function f(t){t.ltr=l(),t.rtl=l(),t.top=l(),t.bottom=l()}function p(){if(!this._.visible||!this._.paused)return this;if(this._.paused=!1,this.media)for(var t=0;t<this._.runningList.length;t++){var e=this._.runningList[t];e._utc=Date.now()/1e3-(this.media.currentTime-e.time)}var i=this,n=function(t,e,i,n){return function(){t(this._.stage);var s=Date.now()/1e3,r=this.media?this.media.currentTime:s,h=this.media?this.media.playbackRate:1,o=null,d=0,u=0;for(u=this._.runningList.length-1;u>=0;u--)o=this._.runningList[u],r-(d=this.media?o.time:o._utc)>this._.duration&&(n(this._.stage,o),this._.runningList.splice(u,1));for(var m=[];this._.position<this.comments.length&&(o=this.comments[this._.position],!((d=this.media?o.time:o._utc)>=r));)r-d>this._.duration||(this.media&&(o._utc=s-(this.media.currentTime-o.time)),m.push(o)),++this._.position;for(e(this._.stage,m),u=0;u<m.length;u++)(o=m[u]).y=a.call(this,o),this._.runningList.push(o);for(u=0;u<this._.runningList.length;u++){o=this._.runningList[u];var c=(this._.width+o.width)*(s-o._utc)*h/this._.duration;"ltr"===o.mode&&(o.x=c-o.width+.5|0),"rtl"===o.mode&&(o.x=this._.width-c+.5|0),"top"!==o.mode&&"bottom"!==o.mode||(o.x=this._.width-o.width>>1),i(this._.stage,o)}}}(this._.engine.framing.bind(this),this._.engine.setup.bind(this),this._.engine.render.bind(this),this._.engine.remove.bind(this));return this._.requestID=d((function t(){n.call(i),i._.requestID=d(t)})),this}function g(){return!this._.visible||this._.paused||(this._.paused=!0,u(this._.requestID),this._.requestID=0),this}function _(){if(!this.media)return this;this.clear(),f(this._.space);var t=m(this.comments,"time",this.media.currentTime);return this._.position=Math.max(0,t-1),this}function v(t){t.play=p.bind(this),t.pause=g.bind(this),t.seeking=_.bind(this),this.media.addEventListener("play",t.play),this.media.addEventListener("pause",t.pause),this.media.addEventListener("playing",t.play),this.media.addEventListener("waiting",t.pause),this.media.addEventListener("seeking",t.seeking)}function w(t){this.media.removeEventListener("play",t.play),this.media.removeEventListener("pause",t.pause),this.media.removeEventListener("playing",t.play),this.media.removeEventListener("waiting",t.pause),this.media.removeEventListener("seeking",t.seeking),t.play=null,t.pause=null,t.seeking=null}function y(t){this._={},this.container=t.container||document.createElement("div"),this.media=t.media,this._.visible=!0,this.engine=(t.engine||"DOM").toLowerCase(),this._.engine="canvas"===this.engine?o:i,this._.requestID=0,this._.speed=Math.max(0,t.speed)||144,this._.duration=4,this.comments=t.comments||[],this.comments.sort((function(t,e){return t.time-e.time}));for(var e=0;e<this.comments.length;e++)this.comments[e].mode=c(this.comments[e].mode);return this._.runningList=[],this._.position=0,this._.paused=!0,this.media&&(this._.listener={},v.call(this,this._.listener)),this._.stage=this._.engine.init(this.container),this._.stage.style.cssText+="position:relative;pointer-events:none;",this.resize(),this.container.appendChild(this._.stage),this._.space={},f(this._.space),this.media&&this.media.paused||(_.call(this),p.call(this)),this}function x(){if(!this.container)return this;for(var t in g.call(this),this.clear(),this.container.removeChild(this._.stage),this.media&&w.call(this,this._.listener),this)Object.prototype.hasOwnProperty.call(this,t)&&(this[t]=null);return this}var b=["mode","time","text","render","style"];function L(t){if(!t||"[object Object]"!==Object.prototype.toString.call(t))return this;for(var e={},i=0;i<b.length;i++)void 0!==t[b[i]]&&(e[b[i]]=t[b[i]]);if(e.text=(e.text||"").toString(),e.mode=c(e.mode),e._utc=Date.now()/1e3,this.media){var n=0;void 0===e.time?(e.time=this.media.currentTime,n=this._.position):(n=m(this.comments,"time",e.time))<this._.position&&(this._.position+=1),this.comments.splice(n,0,e)}else this.comments.push(e);return this}function T(){return this._.visible?this:(this._.visible=!0,this.media&&this.media.paused||(_.call(this),p.call(this)),this)}function E(){return this._.visible?(g.call(this),this.clear(),this._.visible=!1,this):this}function k(){return this._.engine.clear(this._.stage,this._.runningList),this._.runningList=[],this}function C(){return this._.width=this.container.offsetWidth,this._.height=this.container.offsetHeight,this._.engine.resize(this._.stage,this._.width,this._.height),this._.duration=this._.width/this._.speed,this}var D={get:function(){return this._.speed},set:function(t){return"number"!=typeof t||isNaN(t)||!isFinite(t)||t<=0?this._.speed:(this._.speed=t,this._.width&&(this._.duration=this._.width/t),t)}};function z(t){t&&y.call(this,t)}return z.prototype.destroy=function(){return x.call(this)},z.prototype.emit=function(t){return L.call(this,t)},z.prototype.show=function(){return T.call(this)},z.prototype.hide=function(){return E.call(this)},z.prototype.clear=function(){return k.call(this)},z.prototype.resize=function(){return C.call(this)},Object.defineProperty(z.prototype,"speed",D),z}));
  /* eslint-enable */

  class EDE {
    constructor() {
      this.chConvert = 1;
      if (window.localStorage.getItem('chConvert')) {
        this.chConvert = window.localStorage.getItem('chConvert');
      }
      // 0:当前状态关闭 1:当前状态打开
      this.danmakuSwitch = 1;
      if (window.localStorage.getItem('danmakuSwitch')) {
        this.danmakuSwitch = parseInt(window.localStorage.getItem('danmakuSwitch'));
      }
      this.danmaku = null;
      this.episode_info = null;
      this.ob = null;
      this.loading = false;
      this.showDanmakuInfo = true; // 添加新属性
      if (window.localStorage.getItem('showDanmakuInfo') !== null) {
        this.showDanmakuInfo = window.localStorage.getItem('showDanmakuInfo') === 'true';
      }
      this.originalCount = 0; // 添加原始弹幕数量属性
    }
  }

  function createRangeSlider(opt, button) {
    let input = document.createElement('input', rangeSliderOptions);
    input.setAttribute('type', opt.type);
    input.setAttribute('step', opt.step);
    input.setAttribute('min', opt.min);
    input.setAttribute('max', opt.max);
    input.setAttribute('value', opt.value);
    input.oninput = opt.oninput;
    let sliderContainer = document.createElement('div');
    sliderContainer.className = sliderContainerOptions.class;
    sliderContainer.appendChild(input);
    let SliderWrapper = document.createElement('div');
    SliderWrapper.className = sliderWrapperOptions.class;
    SliderWrapper.appendChild(sliderContainer);
    let sliderdiv = document.createElement('div');
    sliderdiv.className = sliderdivOptions.class;
    sliderdiv.style = sliderdivOptions.style;
    sliderdiv.appendChild(button);
    sliderdiv.appendChild(SliderWrapper);
    return sliderdiv;
  }

  function createButton(opt) {
    let button = document.createElement('button', buttonOptions);
    button.setAttribute('title', opt.title);
    button.setAttribute('id', opt.id);
    let icon = document.createElement('span');
    icon.className = 'md-icon';
    icon.innerText = opt.innerText;
    button.appendChild(icon);
    button.onclick = opt.onclick;
    return button;
  }

  function initListener() {
    let container = document.querySelector(mediaQueryStr);
    // 页面未加载
    if (!container) {
      if (window.ede.episode_info) {
        window.ede.episode_info = null;
      }
      return;
    }
    if (!container.getAttribute('ede_listening')) {
      console.log('正在初始化Listener');
      container.setAttribute('ede_listening', true);
      container.addEventListener('play', reloadDanmaku);
      reloadDanmaku();
      console.log('Listener初始化完成');
    }
  }

  function getElementsByInnerText(tagType, innerStr, excludeChildNode = true) {
    var temp = [];
    var elements = document.getElementsByTagName(tagType);
    if (!elements || 0 == elements.length) {
      return temp;
    }
    for (let index = 0; index < elements.length; index++) {
      var e = elements[index];
      if (e.innerText.includes(innerStr)) {
        temp.push(e);
      }
    }
    if (!excludeChildNode) {
      return temp;
    }
    var res = [];
    temp.forEach((e) => {
      var e_copy = e.cloneNode(true);
      while (e_copy.firstChild != e_copy.lastChild) {
        e_copy.removeChild(e_copy.lastChild);
      }
      if (e_copy.innerText.includes(innerStr)) {
        res.push(e);
      }
    });
    return res;
  }

  function initUI() {
    // 页面未加载
    let uiAnchor = getElementsByInnerText('i', uiAnchorStr);
    if (!uiAnchor || !uiAnchor[0]) {
      return;
    }
    // 不在播放页面
    let NotHideFlag = 0;
    let TargetIndex = null;
    for (let index = 0; index < uiAnchor.length; index++) {
      if (uiAnchor[index].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.classList.contains('hide')) {
        continue;
      }
      else {
        NotHideFlag = 1;
        TargetIndex = index;
      }
    }
    if (!NotHideFlag) {
      return;
    }
    // 已初始化
    if (document.getElementById('danmakuCtr') && !document.getElementById('danmakuCtr').parentNode.parentNode.parentNode.parentNode.parentNode.classList.contains('hide')) {
      return;
    }
    // 开始初始化
    console.log('正在初始化UI');
    // 删除旧控件
    if (document.getElementById('danmakuCtr')) {
      document.getElementById('danmakuCtr').remove()
    }
    // 弹幕按钮容器div
    let parent = uiAnchor[TargetIndex].parentNode.parentNode.parentNode;
    let menubar = document.createElement('div');
    menubar.id = 'danmakuCtr';
    menubar.className = menubarOptions.class;
    if (!window.ede.episode_info) {
      menubar.style.opacity = 0.5;
    }
    parent.append(menubar);
    // 弹幕开关/透明度
    displayButtonOpts.innerText = danmaku_icons[window.ede.danmakuSwitch];
    menubar.appendChild(createRangeSlider(transparencyRangeSliderOpts, createButton(displayButtonOpts)));
    // 设置透明度滑块位置
    let level = window.localStorage.getItem('danmakuTransparencyLevel');
    menubar.querySelector('.emby-slider-background-lower').setAttribute('style', 'width: ' + level + '%;');
    menubar.querySelector('.emby-slider-thumb').classList.remove('emby-slider-thumb-mini');
    menubar.querySelector('.emby-slider-thumb').classList.add('emby-slider-thumb-hoveronly');
    menubar.querySelector('.emby-slider-thumb').setAttribute('style', 'inset-inline-start: ' + level + '%;');
    //menubar.appendChild(createButton(displayButtonOpts));
    // 手动匹配
    menubar.appendChild(createButton(searchButtonOpts));
    // 简繁转换
    translateButtonOpts.title = chConverTtitle[window.ede.chConvert];
    menubar.appendChild(createButton(translateButtonOpts));
    // 屏蔽等级
    filterButtonOpts.innerText = filter_icons[parseInt(window.localStorage.getItem('danmakuFilterLevel') ? window.localStorage.getItem('danmakuFilterLevel') : 0)];
    menubar.appendChild(createButton(filterButtonOpts));
    menubar.appendChild(createButton(moreFilterButtonOpts));
    if (!isMobile) {
      // 弹幕信息显示开关
      infoSwitchButtonOpts.innerText = info_switch_icons[window.ede.showDanmakuInfo ? 1 : 0];
      menubar.appendChild(createButton(infoSwitchButtonOpts));
    }
    console.log('UI初始化完成');
  }

  function sendNotification(title, msg) {
    const Notification = window.Notification || window.webkitNotifications;
    console.log(msg);
    if (Notification.permission === 'granted') {
      return new Notification(title, {
        body: msg,
      });
    } else {
      Notification.requestPermission((permission) => {
        if (permission === 'granted') {
          return new Notification(title, {
            body: msg,
          });
        }
      });
    }
  }

  function getEmbyItemInfo() {
    return window.require(['pluginManager']).then((items) => {
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.pluginsList) {
            for (let j = 0; j < item.pluginsList.length; j++) {
              const plugin = item.pluginsList[j];
              if (plugin && plugin.id == 'htmlvideoplayer') {
                return plugin._currentPlayOptions ? plugin._currentPlayOptions.item : null;
              }
            }
          }
        }
      }
      return null;
    });
  }

  async function getEpisodeInfo(is_auto = true) {
    let item = await getEmbyItemInfo();
    if (!item) {
      return null;
    }
    let _id;
    let animeName;
    let episode;
    if (item.Type == 'Episode') {
      _id = item.SeasonId;
      animeName = item.SeriesName;
      episode = item.IndexNumber;
      let session = item.ParentIndexNumber;
      if (session != 1) {
        animeName += ' ' + session;
      }
    } else {
      _id = item.Id;
      animeName = item.Name;
      episode = 'movie';
    }

    // 保存当前播放项信息,供手动搜索使用
    window.ede._searchName = animeName;
    window.ede._currentEpisode = episode === 'movie' ? 0 : episode - 1;

    let _id_key = '_anime_id_rel_' + _id;
    let _episode_key = '_episode_id_rel_' + _id + '_' + episode;

    // 检查本地存储中是否有匹配结果
    if (is_auto && window.localStorage.getItem(_episode_key)) {
      return JSON.parse(window.localStorage.getItem(_episode_key));
    }

    // 如果是手动搜索，直接打开搜索对话框
    if (!is_auto) {
      await showSearchDialog();
      return null;
    }

    // 自动搜索逻辑
    try {
      const searchUrl = 'https://cors.hiback.workers.dev/https://api.dandanplay.net/api/v2/search/episodes?anime=' + encodeURIComponent(animeName);
      const animaInfo = await fetch(searchUrl).then(response => response.json());
      
      if (!animaInfo || !animaInfo.animes || animaInfo.animes.length === 0) {
        console.log('未找到匹配结果');
        return null;
      }

      // 使用第一个搜索结果
      const selectedAnime = animaInfo.animes[0];
      let selectedEpisode;

      if (episode === 'movie') {
        selectedEpisode = selectedAnime.episodes[0];
      } else {
        // 查找对应集数
        selectedEpisode = selectedAnime.episodes.find(ep => {
          const epNum = parseInt(ep.episodeTitle.match(/\d+/)?.[0] || '0');
          return epNum === episode;
        }) || selectedAnime.episodes[episode - 1];
      }

      if (!selectedEpisode) {
        console.log('未找到对应集数');
        return null;
      }

      const episodeInfo = {
        episodeId: selectedEpisode.episodeId,
        animeTitle: selectedAnime.animeTitle,
        episodeTitle: selectedAnime.type === 'tvseries' ? selectedEpisode.episodeTitle : null,
      };

      // 保存匹配结果
      window.localStorage.setItem(_id_key, selectedAnime.animeId);
      window.localStorage.setItem(_episode_key, JSON.stringify(episodeInfo));

      return episodeInfo;
    } catch (error) {
      console.log('自动匹配失败:', error);
      return null;
    }
  }

  async function getComments(episodeId) {
    let url = 'https://cors.hiback.workers.dev/https://api.dandanplay.net/api/v2/comment/' + episodeId + '?withRelated=true&chConvert=' + window.ede.chConvert;
    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log('弹幕下载成功: ' + data.comments.length);
        return data.comments;
      })
      .catch((error) => {
        console.log('获取弹幕失败:', error);
        return null;
      });
  }

  async function createDanmaku(comments) {
    if (!comments) {
      return;
    }

    // 保存原始弹幕数量
    window.ede.originalCount = comments.length;
    
    // 等待视频元素就绪
    const waitForVideo = async () => {
      const video = document.querySelector(mediaQueryStr);
      if (!video || !video.readyState) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return waitForVideo();
      }
      return video;
    };

    await waitForVideo();

    if (window.ede.danmaku != null) {
      window.ede.danmaku.clear();
      window.ede.danmaku.destroy();
      window.ede.danmaku = null;
    }
    let _comments = danmakuFilter(danmakuParser(comments));
    //计算透明度
    let level = parseInt(window.localStorage.getItem('danmakuTransparencyLevel') ? window.localStorage.getItem('danmakuTransparencyLevel') : 100);
    globalOpacity = level / 100;
    console.log('弹幕加载成功: ' + _comments.length);

    let found_flag = 0;
    let _container = null;
    do {
      let _container_list = document.querySelectorAll(mediaContainerQueryStr);
      if (_container_list) {
        for (let index = 0; index < _container_list.length; index++) {
          if (_container_list[index].classList.contains('hide')) {
            continue;
          }
          else {
            _container = _container_list[index];
            found_flag = 1;
            break;
          }
        }
        if (!found_flag) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      else {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    while (!found_flag)

    let _media = document.querySelector(mediaQueryStr);
    window.ede.danmaku = new Danmaku({
      container: _container,
      media: _media,
      comments: _comments,
      engine: 'canvas',
    });
    
    // 添加显示弹幕信息
    appendvideoOsdDanmakuInfo(_comments.length);

    window.ede.danmakuSwitch == 1 ? window.ede.danmaku.show() : window.ede.danmaku.hide();
    if (window.ede.ob) {
      window.ede.ob.disconnect();
    }
    window.ede.ob = new ResizeObserver(() => {
      if (window.ede.danmaku) {
        console.log('Resizing');
        window.ede.danmaku.resize();
      }
    });
    window.ede.ob.observe(_container);
  }

  function reloadDanmaku(type = 'check') {
    if (window.ede.loading) {
      console.log('正在重新加载');
      return;
    }
    window.ede.loading = true;

    // 添加视频元素检查
    const videoElement = document.querySelector(mediaQueryStr);
    if (!videoElement || !videoElement.readyState) {
      console.log('视频元素未就绪，等待重试...');
      window.ede.loading = false;
      setTimeout(() => reloadDanmaku(type), 500);
      return;
    }

    getEpisodeInfo(type != 'search')
      .then((info) => {
        return new Promise((resolve, reject) => {
          if (!info) {
            appendvideoOsdDanmakuInfo();
            if (type != 'init') {
              reject('播放器未完成加载');
            } else {
              reject(null);
            }
          }
          if (type != 'search' && type != 'reload' && window.ede.danmaku && window.ede.episode_info && window.ede.episode_info.episodeId == info.episodeId) {
            reject('当前播放视频未变动');
          } else {
            window.ede.episode_info = info;
            resolve(info.episodeId);
          }
        });
      })
      .then(
        (episodeId) =>
          getComments(episodeId).then((comments) => {
            // 确保视频容器已准备就绪
            return new Promise((resolve) => {
              const checkContainer = () => {
                const container = document.querySelector(mediaContainerQueryStr);
                if (container && !container.classList.contains('hide')) {
                  resolve(comments);
                } else {
                  setTimeout(checkContainer, 200);
                }
              };
              checkContainer();
            }).then(comments => createDanmaku(comments));
          }),
        (msg) => {
          if (msg) {
            console.log(msg);
          }
        },
      )
      .then(() => {
        window.ede.loading = false;
        if (document.getElementById('danmakuCtr')) {
          document.getElementById('danmakuCtr').style.opacity = 1;
        }
      })
      .catch(error => {
        console.error('弹幕加载失败:', error);
        window.ede.loading = false;
      });
  }

  function danmakuFilter(comments) {
    let _comments = [...comments];
    // 类型过滤
    const typeFilters = window.localStorage.getItem('danmakuTypeFilter') ? 
        JSON.parse(window.localStorage.getItem('danmakuTypeFilter')) : [];
    
    _comments = danmakuTypeFilter(_comments, typeFilters);
    
    // 密度过滤
    _comments = danmakuDensityLevelFilter(_comments);
    
    return _comments;
  }

  function danmakuTypeFilter(comments, filters) {
    if (!filters || filters.length === 0) return comments;
    
    // 彩色过滤,只留下默认的白色
    if (filters.includes(danmakuTypeFilterOpts.onlyWhite.id)) {
        comments = comments.filter(c => '#ffffff' === c.style.color.toLowerCase().slice(0, 7));
        filters = filters.filter(f => f !== danmakuTypeFilterOpts.onlyWhite.id);
    }

    // 过滤滚动弹幕(包含从左至右和从右至左)
    if (filters.includes(danmakuTypeFilterOpts.rolling.id)) {
        comments = comments.filter(c => c.mode !== 'ltr' && c.mode !== 'rtl');
        filters = filters.filter(f => f !== danmakuTypeFilterOpts.rolling.id);
    }

    // 按 emoji 过滤
    if (filters.includes(danmakuTypeFilterOpts.emoji.id)) {
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu;
        comments = comments.filter(c => !emojiRegex.test(c.text));
        filters = filters.filter(f => f !== danmakuTypeFilterOpts.emoji.id);
    }

    // 过滤特定模式的弹幕
    if (filters.length > 0) {
        comments = comments.filter(c => !filters.includes(c.mode));
    }

    return comments;
  }

  function danmakuDensityLevelFilter(comments) {
    let level = parseInt(window.localStorage.getItem('danmakuFilterLevel') ? window.localStorage.getItem('danmakuFilterLevel') : 0);
    if (level == 0) {
      return comments;
    }
    let limit = 9 - level * 2;
    let vertical_limit = 6;
    let arr_comments = [];
    let vertical_comments = [];
    for (let index = 0; index < comments.length; index++) {
      let element = comments[index];
      let i = Math.ceil(element.time);
      let i_v = Math.ceil(element.time / 3);
      if (!arr_comments[i]) {
        arr_comments[i] = [];
      }
      if (!vertical_comments[i_v]) {
        vertical_comments[i_v] = [];
      }
      // TODO: 屏蔽过滤
      if (vertical_comments[i_v].length < vertical_limit) {
        vertical_comments[i_v].push(element);
      } else {
        element.mode = 'rtl';
      }
      if (arr_comments[i].length < limit) {
        arr_comments[i].push(element);
      }
    }
    return arr_comments.flat();
  }

  function danmakuParser($obj) {
    //const $xml = new DOMParser().parseFromString(string, 'text/xml')
    return $obj
      .map(($comment) => {
        const p = $comment.p;
        //if (p === null || $comment.childNodes[0] === undefined) return null
        const values = p.split(',');
        const mode = { 6: 'ltr', 1: 'rtl', 5: 'top', 4: 'bottom' }[values[1]];
        if (!mode) return null;
        //const fontSize = Number(values[2]) || 25
        const fontSize = isMobile ? fontSizeMobile : fontSizeDesktop;
        const color = `000000${Number(values[2]).toString(16)}`.slice(-6);
        return {
          text: $comment.m,
          mode,
          time: values[0] * 1,
          style: {
            fontSize: `${fontSize}px`,
            color: `#${color}`,
            textShadow:
              color === '000000' ? '-1px -1px #fff, -1px 1px #fff, 1px -1px #fff, 1px 1px #fff' : '-1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000',

            font: `${fontSize}px sans-serif`,
            fillStyle: `#${color}`,
            strokeStyle: color === '000000' ? '#fff' : '#000',
            lineWidth: 2.0,
          },
        };
      })
      .filter((x) => x);
  }

  function list2string($obj2) {
    const $animes = $obj2.animes;
    let anime_lists = $animes.map(($single_anime) => {
      return $single_anime.animeTitle + ' 类型:' + $single_anime.typeDescription;
    });
    let anime_lists_str = '1:' + anime_lists[0];
    for (let i = 1; i < anime_lists.length; i++) {
      anime_lists_str = anime_lists_str + '\n' + (i + 1).toString() + ':' + anime_lists[i];
    }
    return anime_lists_str;
  }

  function ep2string($obj3) {
    const $animes = $obj3;
    let anime_lists = $animes.map(($single_ep) => {
      return $single_ep.episodeTitle;
    });
    let ep_lists_str = '1:' + anime_lists[0];
    for (let i = 1; i < anime_lists.length; i++) {
      ep_lists_str = ep_lists_str + '\n' + (i + 1).toString() + ':' + anime_lists[i];
    }
    return ep_lists_str;
  }

  const searchAnimeTemplateHtml = `
    <div style="display: flex; flex-direction: column; padding: 1em; background: #1f1f1f; color: #fff;">
      <div style="display: flex; margin-bottom: 1em; justify-content: space-between;">
        <div style="display: flex; flex: 1;">
          <input type="search" is="emby-input" id="danmakuSearchName" class="emby-input" style="background: #333; color: #fff;">
          <button is="emby-button" id="danmakuSearchBtn" class="paper-icon-button-light" title="搜索" style="color: #fff;">
            <span class="md-icon">${search_icon}</span>
          </button>
          <button is="emby-button" id="danmakuToggleTitle" class="paper-icon-button-light" title="切换原标题" style="color: #fff;">
            <span class="md-icon">${translate_icon}</span>
          </button>
        </div>
        <button is="emby-button" id="closeSearchDialog" class="paper-icon-button-light" title="关闭" style="color: #fff; margin-left: 1em;">
          <span class="md-icon">close</span>
        </button>
      </div>
      <div id="danmakuAnimeSelect" style="display: none;">
        <div style="display: flex;">
          <div style="width: 75%;">
            <div style="margin-bottom: 0.5em;">
              <label style="color: #888;">媒体名:</label>
              <select is="emby-select" id="animeSelect" class="emby-select" style="background: #333; color: #fff;"></select>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="flex: 1;">
                <label style="color: #888;">分集名:</label>
                <select is="emby-select" id="episodeSelect" class="emby-select" style="background: #333; color: #fff;"></select>
              </div>
              <button is="emby-button" id="danmakuSwitchEpisode" class="paper-icon-button-light" title="加载弹幕" style="color: #fff; margin-left: 0.5em;">
                <span class="md-icon">done</span>
              </button>
            </div>
          </div>
          <img id="animeImg" style="width: 23%; height: 100%; margin-left: 2%;" loading="lazy" decoding="async" class="coveredImage">
        </div>
      </div>
    </div>`;

  async function showSearchDialog() {
    const dialog = document.createElement('dialog'); 
    dialog.style = 'border: 0; width: 40%; min-width: 320px; max-width: 600px; height: auto; background: transparent; padding: 0;';
    dialog.innerHTML = searchAnimeTemplateHtml;
    document.body.appendChild(dialog);

    // Get elements
    const searchInput = dialog.querySelector('#danmakuSearchName');
    const closeBtn = dialog.querySelector('#closeSearchDialog');
    const searchBtn = dialog.querySelector('#danmakuSearchBtn');
    const toggleBtn = dialog.querySelector('#danmakuToggleTitle');
    const selectDiv = dialog.querySelector('#danmakuAnimeSelect');
    const animeSelect = dialog.querySelector('#animeSelect');
    const episodeSelect = dialog.querySelector('#episodeSelect');
    const switchBtn = dialog.querySelector('#danmakuSwitchEpisode');
    const noResultsMsg = document.createElement('div');
    noResultsMsg.style.color = '#fff';
    noResultsMsg.style.marginTop = '1em';
    selectDiv.appendChild(noResultsMsg);

    // Store animeInfo in dialog element
    let currentAnimeInfo = null;
    let searchPromise = null;

    // 填充搜索框
    if (window.ede._searchName) {
      searchInput.value = window.ede._searchName;
    }

    closeBtn.onclick = () => {
      if (searchPromise && searchPromise.cancel) {
        searchPromise.cancel();
      }
      dialog.remove();
    };

    dialog.addEventListener('close', () => {
      if (searchPromise && searchPromise.cancel) {
        searchPromise.cancel();
      }
      dialog.remove();
    });
    
    // 搜索框回车触发搜索
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });

    searchBtn.onclick = async () => {
      const searchName = searchInput.value.trim();
      if (!searchName) return;

      if (searchPromise && searchPromise.cancel) {
        searchPromise.cancel();
      }

      selectDiv.style.display = 'block';
      
      try {
        searchPromise = searchAnime(searchName);
        currentAnimeInfo = await searchPromise;
        
        if (!currentAnimeInfo || currentAnimeInfo.animes.length === 0) {
          noResultsMsg.textContent = '未找到匹配结果';
          animeSelect.innerHTML = '';
          episodeSelect.innerHTML = '';
          return;
        }

        noResultsMsg.textContent = '';
        
        // 更新选项
        updateAnimeSelects(currentAnimeInfo, animeSelect, episodeSelect);
        updateAnimeImg(currentAnimeInfo.animes[0].animeId);

        // 自动定位到对应集数
        if (window.ede._currentEpisode !== undefined) {
          episodeSelect.value = window.ede._currentEpisode;
        }
        
        animeSelect.onchange = () => {
          const selectedAnime = currentAnimeInfo.animes[animeSelect.value];
          updateEpisodeSelect(selectedAnime);
          updateAnimeImg(selectedAnime.animeId);
        };

      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Search canceled');
        } else {
          console.error('Search failed:', err);
          noResultsMsg.textContent = '搜索失败: ' + err.message;
        }
      }
    };

    toggleBtn.onclick = async () => {
      const item = await getEmbyItemInfo();
      if (item) {
        if (item.OriginalTitle) {
          searchInput.value = item.OriginalTitle;
        } else if (item.Type === 'Episode' && item.SeriesName) {
          const series = await ApiClient.getItem(ApiClient.getCurrentUserId(), item.SeriesId);
          if (series && series.OriginalTitle) {
            searchInput.value = series.OriginalTitle;
          }
        }
        searchBtn.click();
      }
    };

    switchBtn.onclick = async () => {
      if (!currentAnimeInfo) return;
      try {
        const selectedAnime = currentAnimeInfo.animes[animeSelect.value];
        const selectedEpisode = selectedAnime.episodes[episodeSelect.value];
        const episodeInfo = {
          episodeId: selectedEpisode.episodeId,
          animeTitle: selectedAnime.animeTitle, 
          episodeTitle: selectedAnime.type === 'tvseries' ? selectedEpisode.episodeTitle : null,
        };

        // 保存匹配结果
        const item = await getEmbyItemInfo(); 
        if (item) {
          const _id = item.Type === 'Episode' ? item.SeasonId : item.Id;
          const episode = item.Type === 'Episode' ? item.IndexNumber : 'movie';
          const _id_key = '_anime_id_rel_' + _id;
          const _name_key = '_anime_name_rel_' + _id;
          const _episode_key = '_episode_id_rel_' + _id + '_' + episode;

          window.localStorage.setItem(_id_key, selectedAnime.animeId);
          window.localStorage.setItem(_name_key, selectedAnime.animeTitle);
          window.localStorage.setItem(_episode_key, JSON.stringify(episodeInfo));
        }

        window.ede.episode_info = episodeInfo;
        dialog.remove();
        reloadDanmaku('reload');
      } catch (err) {
        console.error('Failed to switch episode:', err);
        noResultsMsg.textContent = '切换失败: ' + err.message;
      }
    };

    // 自动执行搜索
    searchBtn.click();
    dialog.showModal();
  }

  // 添加可取消的搜索函数
  async function searchAnime(name) {
    const controller = new AbortController();
    const signal = controller.signal;
    
    try {
      const searchUrl = 'https://cors.hiback.workers.dev/https://api.dandanplay.net/api/v2/search/episodes?anime=' + name;
      const promise = fetch(searchUrl, { signal })
        .then(response => response.json())
        .catch(error => {
          if (error.name === 'AbortError') {
            throw error;
          }
          console.log('查询失败:', error);
          return null;
        });
      
      // 添加取消功能
      promise.cancel = () => controller.abort();
      return promise;

    } catch (err) {
      console.error('Search failed:', err);
      throw err;
    }
  }

  function updateAnimeSelects(animeInfo, animeSelect, episodeSelect) {
    animeSelect.innerHTML = '';
    animeInfo.animes.forEach((anime, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${anime.animeTitle} (${anime.typeDescription})`;
      animeSelect.appendChild(option);
    });
    
    updateEpisodeSelect(animeInfo.animes[0]);
  }

  function updateEpisodeSelect(anime) {
    const episodeSelect = document.querySelector('#episodeSelect');
    episodeSelect.innerHTML = '';
    if (!anime || !anime.episodes || anime.episodes.length === 0) {
      return;
    }
    anime.episodes.forEach((episode, index) => {
      const option = document.createElement('option');
      option.value = index; 
      option.textContent = episode.episodeTitle || `第${index + 1}话`;
      episodeSelect.appendChild(option);
    });
  }

  function updateAnimeImg(animeId) {
    const animeImg = document.querySelector('#animeImg');
    animeImg.src = `https://img.dandanplay.net/anime/${animeId}.jpg`;
  }

  // 在全局常量区域添加这个样式常量
  const videoOsdDanmakuInfoStyle = 'margin-left: auto; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; position: absolute; right: 0px; bottom: 0px;';

  // 修改弹幕信息显示函数
  function appendvideoOsdDanmakuInfo(loadSum) {
    const episode_info = window.ede.episode_info || {};
    const { episodeId, animeTitle, episodeTitle } = episode_info;
    const videoOsdContainer = document.querySelector(`${mediaContainerQueryStr} .videoOsdSecondaryText`);
    let videoOsdDanmakuTitle = document.getElementById('videoOsdDanmakuTitle');
    
    if (!videoOsdDanmakuTitle) {
      videoOsdDanmakuTitle = document.createElement('h3');
      videoOsdDanmakuTitle.id = 'videoOsdDanmakuTitle';
      videoOsdDanmakuTitle.classList.add('videoOsdTitle');
      videoOsdDanmakuTitle.style = videoOsdDanmakuInfoStyle;
      videoOsdDanmakuTitle.style.display = window.ede.showDanmakuInfo ? 'block' : 'none';
    }

    let text = '弹幕：';
    if (episodeId) {
        text += `${animeTitle} - ${episodeTitle || ''} - ${loadSum}/${window.ede.originalCount}条`;
    } else {
        text += '未匹配';
    }
    
    videoOsdDanmakuTitle.innerText = text;
    if (videoOsdContainer) {
        videoOsdContainer.append(videoOsdDanmakuTitle);
    }
  }

  // 添加获取当前弹幕数量的辅助函数
  function getDanmakuComments(ede) {
    if (ede.danmaku && ede.danmaku.comments) {
      return ede.danmaku.comments;
    }
    return [];
  }

  async function showFilterDialog() {
    const filterDialogHtml = `
        <div style="display: flex; flex-direction: column; padding: 1em; background: #1f1f1f; color: #fff;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 1em;">
                <h3 style="margin: 0;">弹幕过滤设置</h3>
                <button is="emby-button" id="closeFilterDialog" class="paper-icon-button-light" title="关闭">
                    <span class="md-icon">close</span>
                </button>
            </div>
            <div id="filterTypeContainer" style="display: flex; flex-wrap: wrap;"></div>
        </div>
    `;

    const dialog = document.createElement('dialog');
    dialog.style = 'border: 0; width: 40%; min-width: 320px; max-width: 600px; background: transparent; padding: 0;';
    dialog.innerHTML = filterDialogHtml;
    document.body.appendChild(dialog);

    // 获取已保存的过滤类型
    const selectedTypes = window.localStorage.getItem('danmakuTypeFilter') ? 
        JSON.parse(window.localStorage.getItem('danmakuTypeFilter')) : [];

    // 添加过滤选项
    const container = dialog.querySelector('#filterTypeContainer');
    Object.values(danmakuTypeFilterOpts).forEach(opt => {
        const checkbox = document.createElement('label');
        checkbox.style = 'margin: 0.5em; display: flex; align-items: center;';
        checkbox.innerHTML = `
            <input type="checkbox" is="emby-checkbox" 
                ${selectedTypes.includes(opt.id) ? 'checked' : ''}
                value="${opt.id}">
            <span>${opt.name}</span>
        `;
        
        checkbox.querySelector('input').addEventListener('change', (e) => {
            const checked = e.target.checked;
            const value = e.target.value;
            let types = window.localStorage.getItem('danmakuTypeFilter') ? 
                JSON.parse(window.localStorage.getItem('danmakuTypeFilter')) : [];
            
            if (checked && !types.includes(value)) {
                types.push(value);
            } else if (!checked) {
                types = types.filter(t => t !== value);
            }
            
            window.localStorage.setItem('danmakuTypeFilter', JSON.stringify(types));
            reloadDanmaku('reload');
        });
        
        container.appendChild(checkbox);
    });

    dialog.querySelector('#closeFilterDialog').onclick = () => dialog.remove();
    dialog.showModal();
  }

  while (!window.require) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!window.ede) {
    window.ede = new EDE();
    
    // 添加视频就绪检查函数
    const waitForVideoReady = async () => {
      const video = document.querySelector(mediaQueryStr);
      return video && video.readyState;
    };

    setInterval(() => {
      initUI();
    }, check_interval);

    // 等待 Emby 项和视频就绪
    while (!(await getEmbyItemInfo()) || !(await waitForVideoReady())) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // 确保视频就绪后再初始化弹幕
    await new Promise(resolve => setTimeout(resolve, 500)); // 额外等待以确保完全就绪
    reloadDanmaku('init');
    
    setInterval(() => {
      initListener();
    }, check_interval);
  }
})();
