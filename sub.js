"use strict";

var TUG = TUG || {};
TUG.GR = {};

TUG.mCurrentFrame = 0; //経過フレーム数
TUG.mFPS = 60; //フレームレート
TUG.mHeight = 120; //仮想画面高さ
TUG.mWidth = 128; //仮想画面幅

TUG.onTimer = function () {};

TUG.init = function () {
  TUG.GR.mCanvas = document.createElement("canvas"); //仮想画面
  TUG.GR.mCanvas.width = TUG.mWidth;
  TUG.GR.mCanvas.height = TUG.mHeight;
  requestAnimationFrame(TUG.wmTimer);
  TUG.GR.mG = TUG.GR.mCanvas.getContext("2d");
};

// IE対応関数作成(sign関数)
TUG.Sign = function (val) {
  if (val == 0) {
    return 0;
  }
  if (val < 0) {
    return -1;
  }
  return 1;
};

TUG.wmTimer = function () {
  //初回呼び出し判定
  if (!TUG.mCurrentStart) {
    TUG.mCurrentStart = performance.now();
  }

  let d = Math.floor(
    ((performance.now() - TUG.mCurrentStart) * TUG.mFPS) / 1000
  );
  // console.log(d);
  if (d > 0) {
    TUG.onTimer(d);
    TUG.mCurrentFrame += d;
  }
  requestAnimationFrame(TUG.wmTimer);
};
