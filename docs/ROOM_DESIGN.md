# ROOM_DESIGN.md — 背景の部屋デザイン規約

アバター窓の背景に採用する「可愛い女の子の部屋」の意匠ルール集。
ウェブ調査で裏取りした一次ソース付き。CSS で再現可能な形に落とす。

---

## A. パレット候補

### A-1. "Milk & Petal" — 柔らかなカワイイ昼光
`#FFF6F2` `#FFE0E9` `#F5C9D6` `#E6B8D4` `#B7D9E8` `#8C9EB8`
低彩度＋白でつくる典型的なカワイイパステル [1]。最終色はコントラスト用の
暗めトーン — パステルは「暗色との対比でこそ映える」[1]。

### A-2. "Warm Afternoon Room" — スライス・オブ・ライフの室内光【採用】
`#FFF2D8` `#F7D9B0` `#E8B892` `#C98A6B` `#6B4E3D` `#A8C4A2`
ジブリ系の背景画は「湿度（空気の密度・光の広がり・遠近感）」を軸に色を
選ぶ [2]。クリーム／オーカー主体に緑一点で「日差しの室内空気」を表現。

### A-3. "Dusk Study" — コテージコア、抑えた夕刻
`#EFE6D8` `#D9C7A7` `#B8A27A` `#8A9A7B` `#C47E6A` `#3E4A52`
コテージコアは「抑えたアースカラー（ベージュ／茶／オーカー／淡い緑）」を
基調に、白で土台を作る [3]。深いスレートでパステル・マッドを回避。

---

## B. 構図のルール

1. **三層構成を明示する** — foreground / midground / background の重なりが
   小さなキャンバスに奥行きを与える [5][6]。
2. **アバターは三分割グリッドの交点に** — 真ん中ドン置きは「弱くつまらない
   配置」になる [5]。
3. **背景は低彩度＋軽いぼかしでキャラを前に出す** — 「低彩度で色あせた
   背景はキャラクターに視線を誘導する」[4]。
4. **暖色の指向性光源を一つだけ持つ** — ジブリ作法では一つの湿度／色温度
   に統一 [2]。
5. **背景色はキャラの支配色のソフトな補色に** — 黄色いキャラを青い環境に
   置くと「キャラがより目立つ」[4]。
6. **最大輝度・最高彩度はアバターのシルエット近くに残す** — 最後の仕上げで
   キャラ際に置くことで奥行きが最大化する [5]。
7. **一つの時間帯にコミット** — 暖かい卓上ランプ＋昼の青空＋夕焼けリム光の
   混在は情報として破綻する [2]。

---

## C. モチーフメニュー（CSS / SVG 実装可能）

1. **窓枠＋柔らかな空グラデーション** — `linear-gradient` ペイン＋太陽の
   `radial-gradient` [2][7]。
2. **透けるカーテン** — `backdrop-filter: blur` の半透明 div。微妙な
   `translateX` アニメで揺らす。
3. **チェアレール／壁の水平モール** — 60% 高あたりで `border-top`、壁色を
   上下に分割。
4. **パステルの水玉壁紙** — `background: radial-gradient` をタイリング [1]。
5. **額装絵画** — 入れ子 div、丸角、`drop-shadow`、内部パステル。
6. **観葉植物（葉クラスター）** — SVG パスのブロブ、緑 3 階調 [3][7]。
7. **フェアリーライト** — SVG `path` ＋ `circle`、`filter: blur` で発光 [8]。
8. **ぬいぐるみシルエット** — 丸い SVG ブロブと二点目。soft-girl の定番 [8]。
9. **本棚の一列** — 高さ違いの色付き `div` を `flex` で並べる。
10. **デスクランプ** — SVG 台形＋電球円＋ `radial-gradient` の光円錐。
11. **ハート／星のコンフェッティ** — 小 SVG、`position: absolute`、パララックス。
12. **湯気の立つマグ** — SVG カップ＋波打つ `path` の湯気。
13. **波打つ鏡** — SVG ブロブに細いストローク。soft-girl 流行 [8]。
14. **ドライフラワー束** — コテージコアの定番 [3]。SVG の茎数本＋矩形花瓶。
15. **壁掛け丸時計** — `border-radius: 50%` ＋回転させた針 `div` 二本。
16. **床のラグの端** — 横長楕円、ソフトグラデーションで床面を示唆。
17. **チェッカーボード／雲のポスター** — Gen-Z 装飾の手がかり [8]。
18. **ソフトヴィネット** — 全面 `radial-gradient`、透明 → 20% 黒。

---

## D. アンチパターン

1. アバター背後に **彩度・コントラストの高い背景色** — キャラと競合する [4]。
2. 全モチーフを **画面中央に揃える** — 弱い構図になる [5]。
3. **レイヤー重なりのない単一平面の壁** — 奥行きの要素が消える [5]。
4. **暗いアンカー色なしの純パステル敷き詰め** — パステルは暗色対比で映える [1]。
5. **時間帯の混在** — 湿度と色温度は一つにコミット [2]。

---

## E. 出典

1. SchemeColor, _Cute Kawaii Pastels_ — https://www.schemecolor.com/cute-kawaii-pastels.php
2. Gvaat's Workshop, _How to Paint Ghibli Backgrounds_ — https://gvaat.com/blog/how-to-paint-ghibli-backgrounds/ ；It's Nice That, Yoji Takeshige 特集 — https://www.itsnicethat.com/articles/yoji-takeshige-painting-the-worlds-of-studio-ghibli-publication-animation-050226
3. Aesthetic Roomcore, _Cottagecore Aesthetic Room_ — https://www.aestheticroomcore.com/blogs/aesthetic-room-blog/how-to-create-a-cottagecore-aesthetic-room
4. CharacterHub, _Character Color Palette via Color Theory_ — https://characterhub.com/blog/character-resources/character-color-palette ；DreamFarm Studios — https://dreamfarmstudios.com/blog/color-theory-for-character-design/
5. Ran Art Blog, _Still Life Composition_ — https://ranartblog.com/blogarticle09.html ；Samuel Earp — https://samuelearp.com/blog/how-to-paint-a-still-life-in-9-steps/
6. GameMaker, _Creating Depth & Immersion: Parallax_ — https://stage.gamemaker.io/en/blog/creating-depth-and-immersion-parallax
7. Home Art Haven, _Art of Backgrounds: Creating Worlds in Anime_ — https://homearthaven.com/blogs/news/the-art-of-backgrounds-creating-worlds-in-anime
8. Homio Decor, _Top 7 Decor Styles Gen Z_ — https://homiodecor.com/blogs/for-inspiration/aesthetic-overload-top-7-decor-styles-gen-z-can-t-get-enough-of ；The Feelz — https://thefeelz.store/blogs/home-decor/soft-girl-aesthetic-room-decor-inspiration-and-ide
9. MasterClass, _Guide to Using Depth in Art_ — https://www.masterclass.com/articles/depth-in-art-explained

**調査メモ**：WebFetch が一部ドメイン（roomtery.com、animationobsessive.substack.com 等）で
egress-allowlist により拒否されたため、引用は WebSearch 結果の抜粋経由。
claims はすべて URL に紐付け済み、特定ブランド／作品／インフルエンサー名は除外。
