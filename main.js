"use strict";
const CHRHEIGHT = 9; //キャラの高さ
const CHRWEIDTH = 8; //キャラの幅
const FONT = "9px monospace"; //文字フォント
const FONTSTYLE = "#ffffff"; //文字色
const HEIGHT = 120; //仮想画面サイズ 高さ
const WIDTH = 128; //仮想画面サイズ 幅
const INTERVAL = 33; //フレーム呼び出し感覚
const MAP_HEIGHT = 32; //マップ高さ
const MAP_WIDTH = 32; // マップ幅
const SRC_HEIGHT = 8; //画面タイルサイズの半分の高さ
const SRC_WIDTH = 8; //画面タイルサイズの半分の幅
const SCROLL = 1; //スクロール速度
const SMOOTH = 0; //補完処理
const START_Y = 17; //開始位置Y
const START_X = 15; //開始位置X
const START_HP = 20; //初期HP
const TILECOLUMN = 4; //タイル桁数
const TILEROW = 4; //タイル行数
const TILESIZE = 8; //タイルサイズ(ドット)
const WNDSTYLE = "rgba(0,0,0,0.75)"; //ウィンドウ色

const gKey = new Uint8Array(0x100); //キー入力バッハ

let gAngle = 0; //プレイヤーの向き
let gEx = 0; //プレイヤーの経験値
let gHP = START_HP; //プレイヤーのヒットポイント
let gMHP = START_HP; //プレイヤーの最大ヒットポイント
let gLv = 1; //プレイヤーのレベル
let gCursor = 0; //カーソル1
let gEnemyHP; //敵HP
let gEnemyType; //敵種別
let gFrame = 0; //内部カウンタ
let gWidth; //実画面の高さ
let gHeight; //実画面の幅
let gImgBoss = false;
let gImgMap; //画像、マップ
let gImgMonster; //画像、モンスター
let gImgPlayer; //画像、プレイヤー
let gItem = 0; //所持アイテム（鍵）
let gMessage1 = null; //メッセージ番号
let gMessage2 = null; //メッセージ番号
let gMoveY = 0; //移動量Y
let gMoveX = 0; //移動量X
let gOrder; //行動順
let gPhase = 0; //戦闘フェーズ
let gPlayerY = START_Y * TILESIZE + TILESIZE / 2; //プレイヤー座標Y
let gPlayerX = START_X * TILESIZE + TILESIZE / 2; //プレイヤー座標X

const gFileBoss = "img/boss.png";
const gFileMap = "img/map.png";
const gFileMonster = "img/monster.png";
const gFilePlayer = "img/player.png";

const gEncounter = [0, 0, 0, 1, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0];
const gMonsterName = ["Slime", "Rabbit", "knight", "Dragon", "Demon King"];

// 戦闘行動処理
function Action() {
  gPhase++; //フェーズ経過

  // 敵の行動処理
  if (((gPhase + gOrder) & 1) == 0) {
    const d = getDamage(gEnemyType + 2);
    setMessage(gMonsterName[gEnemyType] + " Attack", d + " Damage");
    gHP -= d;
    if (gHP <= 0) {
      //死亡時の処理
      gPhase = 7;
    }
    return;
  }

  // プレイヤーの行動処理
  if (gCursor == 0) {
    const d = getDamage(gLv + 1);
    setMessage("You Attack !", d + " Damage");
    gEnemyHP -= d;
    if (gEnemyHP <= 0) {
      gPhase = 5;
    }
    return;
  }

  //逃げる成功時
  if (Math.random() < 0.5) {
    setMessage("You escaped", null);
    gPhase = 6;
    return;
  }
  // 逃げる失敗時
  setMessage("You escaped. But the", "enemy has caught up to you");
}

//経験値加算
function AddExp(val) {
  gEx += val;
  //レベルアップ条件
  while (gLv * (gLv + 1) * 2 < gEx) {
    gLv++;
    gMHP += 4 + Math.floor(Math.random() * 3);
  }
}

//敵出現処理
function AppearEnemy(t) {
  gPhase = 1;
  gEnemyHP = t * 3 + 5;
  gEnemyType = t;
  setMessage("The enemy is here.", null);
}

//戦闘コマンド
function CommandFight() {
  gPhase = 2; //戦闘コマンド選択フェーズ
  gCursor = 0;
  setMessage("　　　　Fight", "　　　　escape");
}

//戦闘画面描画処理
function DrawFight(g) {
  g.fillStyle = "#000000";
  g.fillRect(0, 0, WIDTH, HEIGHT);

  if (gPhase <= 5) {
    //	敵が生存している場合
    if (IsBoss()) {
      g.drawImage(
        gImgBoss,
        WIDTH / 2 - gImgBoss.width / 2,
        HEIGHT / 2 - gImgBoss.height / 2
      );
    } else {
      let w = gImgMonster.width / 4;
      let h = gImgMonster.height;

      //敵の表示
      g.drawImage(
        gImgMonster,
        gEnemyType * w,
        0,
        w,
        h,
        Math.floor(WIDTH / 2 - w / 2),
        Math.floor(HEIGHT / 2 - h / 2),
        w,
        h
      );
    }
  }

  DrawStatus(g);
  DrawMessage(g);

  if (gPhase == 2) {
    g.fillText("⇨", 6, 96 + 14 * gCursor); //カーソル描画
  }
}

//フィールド画面描画処理
function DrawField(g) {
  let mx = Math.floor(gPlayerX / TILESIZE); //プレイヤーのタイル座標
  let my = Math.floor(gPlayerY / TILESIZE);

  for (let dy = -SRC_HEIGHT; dy <= SRC_HEIGHT; dy++) {
    let ty = my + dy; //タイル座標Y
    let py = (ty + MAP_HEIGHT) % MAP_HEIGHT; //ループ後タイル座標Y
    for (let dx = -SRC_WIDTH; dx <= SRC_WIDTH; dx++) {
      let tx = mx + dx; //タイル座標X
      let px = (tx + MAP_WIDTH) % MAP_WIDTH; //ループ後タイル座標X
      DrawTile(
        g,
        tx * TILESIZE + WIDTH / 2 - gPlayerX,
        ty * TILESIZE + HEIGHT / 2 - gPlayerY,
        gMap[py * MAP_WIDTH + px]
      ); //１ドット単位で移動できる
    }
  }

  //プレイヤー
  g.drawImage(
    gImgPlayer,
    ((gFrame >> 3) & 1) * CHRWEIDTH,
    gAngle * CHRHEIGHT,
    CHRWEIDTH,
    CHRHEIGHT,
    WIDTH / 2 - CHRWEIDTH / 2,
    HEIGHT / 2 - CHRHEIGHT + TILESIZE / 2,
    CHRWEIDTH,
    CHRHEIGHT
  );

  // ステータスウィンドウ
  g.fillStyle = WNDSTYLE;
  g.fillRect(2, 2, 44, 37);
  DrawStatus(g);
  DrawMessage(g);
}

function DrawMain() {
  const g = TUG.GR.mG;

  if (gPhase <= 1) {
    DrawField(g); //マップ描画
  } else {
    DrawFight(g);
  }

  // デバッグ
  // g.fillStyle = WNDSTYLE;
  // g.fillRect(20, 3, 105, 15);
  // g.font = FONT;
  // g.fillStyle = FONTSTYLE;
  // g.fillText(
  //   "x = " +
  //     gPlayerX +
  //     " y = " +
  //     gPlayerY +
  //     " m = " +
  //     gMap[my * MAP_WIDTH + mx],
  //   25,
  //   15
  // );

  // 中心線
  // g.fillStyle = "#ff0000";
  // g.fillRect(0, HEIGHT / 2 - 1, WIDTH, 2);
  // g.fillRect(WIDTH / 2 - 1, 0, 2, HEIGHT);
}

// メッセージ描画
function DrawMessage(g) {
  if (!gMessage1) {
    return;
  }
  g.fillStyle = WNDSTYLE;
  g.fillRect(4, 84, 120, 30);

  g.font = FONT;
  g.fillStyle = FONTSTYLE;
  g.fillText(gMessage1, 6, 96);
  if (gMessage2) {
    g.fillText(gMessage2, 6, 110); //null以外の場合に2行目を表示する
  }
}

//ステータス描写
function DrawStatus(g) {
  g.font = FONT;
  g.fillStyle = FONTSTYLE;
  g.fillText("Lv", 4, 13);
  DrawTextR(g, gLv, 36, 13);
  g.fillText("HP", 4, 25);
  DrawTextR(g, gHP, 36, 25);
  g.fillText("Ex", 4, 37);
  DrawTextR(g, gEx, 36, 37);
}

function DrawTextR(g, str, x, y) {
  g.textAlign = "right";
  g.fillText(str, x, y);
  g.textAlign = "left";
}

function DrawTile(g, x, y, idx) {
  const ix = (idx % TILECOLUMN) * TILESIZE;
  const iy = Math.floor(idx / TILECOLUMN) * TILESIZE;
  g.drawImage(gImgMap, ix, iy, TILESIZE, TILESIZE, x, y, TILESIZE, TILESIZE);
}

// ダメージ量算出式
function getDamage(a) {
  return Math.floor(a * (1 + Math.random()));
}

function IsBoss() {
  return gEnemyType == gMonsterName.length - 1;
}

function LoadImage() {
  gImgMap = new Image();
  gImgMap.src = gFileMap;
  gImgMonster = new Image();
  gImgMonster.src = gFileMonster;
  gImgPlayer = new Image();
  gImgPlayer.src = gFilePlayer;
  gImgBoss = new Image();
  gImgBoss.src = gFileBoss;
}

// function setMessage (v1, v2 = null) nullをいちいち書かなくても済むがIE非対応
function setMessage(v1, v2) {
  gMessage1 = v1;
  gMessage2 = v2;
}

// フィールド侵攻処理
function TickField() {
  if (gPhase != 0) return;

  if (gMoveX != 0 || gMoveY != 0 || gMessage1) {
    //移動中またはメッセージ表示中の場合
  } else if (gKey[37]) {
    gAngle = 1;
    gMoveX = -TILESIZE;
  } else if (gKey[38]) {
    gAngle = 3;
    gMoveY = -TILESIZE;
  } else if (gKey[39]) {
    gAngle = 2;
    gMoveX = TILESIZE;
  } else if (gKey[40]) {
    gAngle = 0;
    gMoveY = TILESIZE;
  }

  //移動後のタイル座標判定
  let mx = Math.floor((gPlayerX + gMoveX) / TILESIZE); //タイル座標X
  let my = Math.floor((gPlayerY + gMoveY) / TILESIZE); //タイル座標X
  mx + MAP_WIDTH; //マップループ処理X
  mx % MAP_WIDTH; //マップループ処理X
  my + MAP_HEIGHT; //マップループ処理Y
  my % MAP_HEIGHT; //マップループ処理Y
  let m = gMap[my * MAP_WIDTH + mx]; //タイル番号
  if (m < 3) {
    gMoveX = 0; //移動禁止X
    gMoveY = 0; //移動禁止Y
  }

  if (Math.abs(gMoveX) + Math.abs(gMoveY) == SCROLL) {
    //移動終了後にメッセージを表示する
    if (m == 8 || m == 9) {
      //お城
      gHP = gMHP;
      setMessage("Fight the Demon King !", null);
    }
    if (m == 10 || m == 11) {
      //街
      gHP = gMHP;
      setMessage("There's another village ", "in the far west.");
    }
    if (m == 12) {
      //村
      gHP = gMHP;
      setMessage("The key is in the cave. ", null);
    }
    if (m == 13) {
      //洞窟
      gItem = 1; //アイテム（鍵）入手
      setMessage("You get the key !", null);
    }
    if (m == 14) {
      //扉
      if (gItem == 0) {
        gPlayerY -= TILESIZE; //１マス戻す
        setMessage("You need a key to the door.", null);
      } else {
        setMessage("The door is open !.", null);
      }
    }
    if (m == 15) {
      AppearEnemy(gMonsterName.length - 1);
    }
    //エンカウント確立
    if (Math.random() * 16 < gEncounter[m]) {
      let t =
        Math.abs(gPlayerX / TILESIZE - START_X) +
        Math.abs(gPlayerY / TILESIZE - START_Y);
      if ((m = 6)) {
        //マップタイプ林
        t += 8;
      }
      if ((m = 7)) {
        //マップタイプ山
        t += 16;
      }
      t += Math.random() * 8;
      t = Math.floor(t / 16);
      t = Math.min(t, gMonsterName.length - 2);
      AppearEnemy(t);
    }
  }

  gPlayerX += TUG.Sign(gMoveX) * SCROLL; //プレイヤー座標移動X
  gPlayerY += TUG.Sign(gMoveY) * SCROLL; //プレイヤー座標移動Y
  gMoveX -= TUG.Sign(gMoveX) * SCROLL; //移動消費量X
  gMoveY -= TUG.Sign(gMoveY) * SCROLL; //移動消費量Y

  //マップループ処理
  gPlayerX += MAP_WIDTH * TILESIZE;
  gPlayerX %= MAP_WIDTH * TILESIZE;
  gPlayerY += MAP_HEIGHT * TILESIZE;
  gPlayerY %= MAP_HEIGHT * TILESIZE;
}

function WmPaint() {
  DrawMain();

  const ca = document.getElementById("main");
  const g = ca.getContext("2d");

  g.drawImage(
    TUG.GR.mCanvas,
    0,
    0,
    TUG.GR.mCanvas.width,
    TUG.GR.mCanvas.height,
    0,
    0,
    gWidth,
    gHeight
  ); //仮想画面のイメージをキャンバスへ移送
}

//ブラウザサイズ変更イベント
function WmSize() {
  const ca = document.getElementById("main");
  ca.width = window.innerWidth;
  ca.height = window.innerHeight;

  const g = ca.getContext("2d");
  g.imageSmoothingEnabled = g.msImageSmoothingEnabled = SMOOTH;

  // 実画面サイズを計測。ドットのアスペクト比を維持したままでの最大サイズを計測する
  gWidth = ca.width;
  gHeight = ca.height;
  if (gWidth / WIDTH < gHeight / HEIGHT) {
    gHeight = (gWidth * HEIGHT) / WIDTH;
  } else {
    gWidth = (gHeight * WIDTH) / HEIGHT;
  }
}

// タイマーイベント発生時の処理
TUG.onTimer = function () {
  if (!gMessage1) {
    gFrame++;
    TickField(); //フィールド侵攻処理
  }
  WmPaint();
};

// ※タイマーイベント発生時の処理（PCのFPSに合わせる場合）
// TUG.onTimer = function (d) {
//   if (!gMessage1) {
//     while (d--) {
//       gFrame++;
//       TickField(); //フィールド侵攻処理
//     }
//   }
//   WmPaint();
// };

// キー入力イベント
window.onkeydown = function (ev) {
  let c = ev.keyCode;

  if (gKey[c] != 0) {
    //既に押下中の場合（キーリピート）
    return;
  }
  gKey[c] = 1;

  // 敵が現れた
  if (gPhase == 1) {
    CommandFight();
    return;
  }
  if (gPhase == 2) {
    //Enter or Z キーの場合
    if (c == 13 || c == 90) {
      gOrder = Math.floor(Math.random() * 2);
      Action();
    } else {
      gCursor = 1 - gCursor; //カーソル移動
    }
    return;
  }
  if (gPhase == 3) {
    Action();
    return;
  }
  if (gPhase == 4) {
    CommandFight();
    return;
  }
  if (gPhase == 5) {
    gPhase = 6;
    AddExp(gEnemyType + 1);
    setMessage("You Win !", null);
    return;
  }
  if (gPhase == 6) {
    if (IsBoss() && gCursor == 0) {
      setMessage("You defeated the Demon King", "The world is at peace.");
      return;
    }
    gPhase = 0;
  }
  if (gPhase == 7) {
    gPhase = 8;
    setMessage("You Dead", null);
    return;
  }
  if (gPhase == 8) {
    setMessage("GAME OVER", null);
    return;
  }

  gMessage1 = null;
};

//キー入力(UP)イベント
window.onkeyup = function (ev) {
  gKey[ev.keyCode] = 0;
};

// ブラウザ起動イベント
window.onload = function () {
  LoadImage();

  WmSize();
  window.addEventListener("resize", function () {
    WmSize(); //画面サイズ初期化（ゲーム中にサイズ変更に対応）
  });
  TUG.init();
};

// 終了の操作
document.getElementById("btn").addEventListener("click", () => {
  window.close();
});
// 終了の操作
document.getElementById("end").addEventListener("click", () => {
  window.close();
});
// 終了の操作
document.getElementById("try").addEventListener("click", () => {
  location.reload();
});
