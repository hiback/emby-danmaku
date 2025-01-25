# emby-danmaku

## Emby danmaku extension

![1737812914239](images/README/1737812914239.png)

## 版本变化

### 1.0.1

-添加高级过滤按钮，可按需过滤滚动弹幕和顶/底部等弹幕
  - 以上修改基于 [dd-danmaku](https://github.com/chen3861229/dd-danmaku)
-添加弹幕信息关闭按钮，删除原有弹幕信息按键
-弹幕信息添加原有弹幕数量与加载弹幕数量
-修改弹幕加载时机逻辑，避免某些浏览器（edge）会在播放时没有加载弹幕

### 1.0

- 右下角添加弹幕信息展示功能
- 搜索弹幕 UI 修改，添加图片展示和原标题切换按钮
  - 以上修改基于 [dd-danmaku](https://github.com/chen3861229/dd-danmaku)
- 修复手动填充时无法自动填充标题和集数的问题

## 引用项目

此项目基于以下代码库：

- **Forked from hiback/emby-danmaku**
  Repository: [https://github.com/hiback/emby-danmaku](https://github.com/hiback/emby-danmaku)
  License: MIT License
- **原项目 dd-danmaku** by 9channel
  Repository: [https://github.com/9channel/dd-danmaku](https://github.com/9channel/dd-danmaku)
  License: MIT License
- **使用代码来自 dd-danmaku** by chen3861229
  Repository: [https://github.com/chen3861229/dd-danmaku](https://github.com/chen3861229/dd-danmaku)
  License: MIT License

## 安装

任选以下一种方式安装即可

### 修改服务端

修改文件 /system/dashboard-ui/index.html (Docker版,其他类似),在`</body>`前添加如下标签

```
<script src="https://cdn.jsdelivr.net/gh/hiback/emby-danmaku@develop/ede.js" defer></script>
```

该方式安装与浏览器插件安装**可同时使用不冲突**

### 修改客户端

类似服务端方式,解包后修改 dashboard-ui/index.html 再重新打包即可,iOS 需要通过类似 AltStore 方式自签,请自行 Google 解决

## 界面

**请注意Readme上方截图可能与最新版存在差异,请以实际版本与说明为准**

左下方新增如下按钮,若按钮透明度与"暂停"等其他原始按钮存在差异,说明插件正在进行加载

- 弹幕开关: 切换弹幕显示/隐藏状态
- 手动匹配: 手动输入信息匹配弹幕
- 简繁转换: 在原始弹幕/简体中文/繁体中文3种模式切换
- 过滤等级: 过滤弹幕强度,等级越高强度越大,0级无限制*
- 弹幕信息: 通过通知(以及后台log)显示当前匹配弹幕信息

  **除0级外均带有每3秒6条的垂直方向弹幕密度限制,高于该限制密度的顶部/底部弹幕将会被转为普通弹幕*

## 弹幕

弹幕来源为 [弹弹 play](https://www.dandanplay.com/) ,已开启弹幕聚合(A/B/C 站等网站弹幕融合)

## 数据

匹配完成后对应关系会保存在**浏览器(或客户端)本地存储**中,后续播放(包括同季的其他集)会优先按照保存的匹配记录载入弹幕

## 常见弹幕加载错误/失败原因

1. 译名导致的异常: 如『よふかしのうた』 Emby 识别为《彻夜之歌》后因为弹弹 play 中为《夜曲》导致无法匹配
2. 存在多季/剧场版/OVA 等导致的异常: 如『OVERLORD』第四季若使用S[N]格式归档(如OVERLORD/S4E1.mkv或OVERLORD/S4/E1.mkv),可能出现匹配失败/错误等现象

**首次播放时请检查当前弹幕信息是否正确匹配,若匹配错误请尝试手动匹配**
