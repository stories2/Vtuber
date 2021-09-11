import { FaceManager } from './facemanager';
import { TouchManager } from './touchmanager';

export class InterfaceManager {
  canvasEle: HTMLCanvasElement;

  camSwitch: HTMLElement;
  moveSwitch: HTMLElement;
  shareSwitch: HTMLElement;
  btnZoomIn: HTMLButtonElement;
  btnZoomOut: HTMLButtonElement;

  shareVideoEle: HTMLVideoElement;
  shareStream: MediaStream;

  isMoveEnabled: boolean;
  isMove: boolean;
  lastX: number;
  lastY: number;

  posX: number;
  posY: number;
  scale: number;

  touchManager: TouchManager;
  faceManager: FaceManager;

  gdmOptions = {
    video: {
      cursor: 'always'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100
    }
  } as DisplayMediaStreamConstraints;

  constructor(
    canvasEle: HTMLCanvasElement,
    touchManager: TouchManager,
    faceManager: FaceManager
  ) {
    this.isMoveEnabled = false;
    this.isMove = false;
    this.lastX = 0;
    this.lastY = 0;
    this.posX = 0;
    this.posY = 0;
    this.scale = 1;

    this.loadProfile();

    this.canvasEle = canvasEle;
    this.touchManager = touchManager;
    this.faceManager = faceManager;

    this.camSwitch = document.querySelector('div.cam-switch');
    this.moveSwitch = document.querySelector('div.pos-move-switch');
    this.shareSwitch = document.querySelector('div.pos-share-switch');

    this.btnZoomIn = document.querySelector('button.btn-zoom-in');
    this.btnZoomOut = document.querySelector('button.btn-zoom-out');

    this.shareVideoEle = document.querySelector('video#share');
    this.shareStream = null;

    this.initEvent();
  }

  initEvent() {
    this.canvasEle.addEventListener('touchstart', e =>
      this.moveStart(e.touches[0].clientX, e.touches[0].clientY)
    );
    this.canvasEle.addEventListener('touchmove', e =>
      this.movePos(e.touches[0].clientX, e.touches[0].clientY)
    );
    this.canvasEle.addEventListener('touchend', e => {
      this.isMove = false;
      this.saveProfile();
    });
    this.canvasEle.addEventListener('touchcancel', e => {
      this.isMove = false;
      this.saveProfile();
    });
    this.canvasEle.addEventListener('mousedown', e =>
      this.moveStart(e.clientX, e.clientY)
    );
    this.canvasEle.addEventListener('mousemove', e =>
      this.movePos(e.clientX, e.clientY)
    );
    this.canvasEle.addEventListener('mouseup', e => {
      this.isMove = false;
      this.saveProfile();
    });

    this.camSwitch.addEventListener('change', e => this.toggleCam());

    this.moveSwitch.addEventListener(
      'change',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      e => (this.isMoveEnabled = (e.target as any).checked)
    );

    this.shareSwitch.addEventListener('change', e =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.toggleShareDesktop((e.target as any).checked)
    );

    this.btnZoomIn.addEventListener('click', e => {
      if (this.scale < 3.0) {
        this.saveProfile();
        this.scale += 0.05;
      }
    });
    this.btnZoomOut.addEventListener('click', e => {
      if (this.scale > 0.5) {
        this.saveProfile();
        this.scale -= 0.05;
      }
    });
  }

  toggleShareDesktop(enabled: boolean) {
    if (enabled && navigator.mediaDevices.getDisplayMedia) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
      navigator.mediaDevices
        .getDisplayMedia(this.gdmOptions)
        .then(srcObj => {
          this.shareVideoEle.srcObject = srcObj;
          console.log(srcObj);
        })
        .catch(err => {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions,@typescript-eslint/no-unsafe-member-access
          console.error(`Error: ${err.message}`);
        });
    } else if (enabled) {
      console.warn('Desktop capture api not supported.');
    } else {
      (this.shareVideoEle.srcObject as MediaStream)
        .getTracks()
        .forEach(track => {
          track.stop();
        });
      this.shareVideoEle.srcObject = null;
    }
  }

  toggleCam() {
    if (this.faceManager.isVideoReady) {
      this.faceManager.closeCam();
    } else {
      this.faceManager.openCam().then(camResult => {
        // if (camResult) {
        // }
      });
    }
  }

  posNormalize(x: number, y: number) {
    return [x / this.canvasEle.width, y / this.canvasEle.height];
  }

  moveStart(_x: number, _y: number) {
    if (this.isMoveEnabled) {
      this.isMove = true;
      [this.lastX, this.lastY] = this.posNormalize(_x, _y);
    }
  }

  movePos(_x: number, _y: number) {
    if (this.isMoveEnabled && this.isMove) {
      const [x, y] = this.posNormalize(_x, _y);
      this.posX += x - this.lastX;
      this.posY += this.lastY - y;
      this.lastX = x;
      this.lastY = y;
    }
  }

  saveProfile() {
    localStorage.setItem('scale', this.scale.toString());
    localStorage.setItem('posX', this.posX.toString());
    localStorage.setItem('posY', this.posY.toString());
  }

  loadProfile() {
    this.scale = Number.parseFloat(localStorage.getItem('scale') || `1.0`);
    this.posX = Number.parseFloat(localStorage.getItem('posX') || `0`);
    this.posY = Number.parseFloat(localStorage.getItem('posY') || `0`);
    console.log(this.scale, this.posX, this.posY);
  }
}
