import '@tensorflow/tfjs-backend-webgl';
import {
  load,
  SupportedPackages
} from '@tensorflow-models/face-landmarks-detection';
import { FaceLandmarkFrameSkip } from './lappdefine';
import { LandMarkAnnotations } from './models/facelandmark';
import { Modal } from 'bootstrap';

export class FaceManager {
  videoEle: HTMLVideoElement;
  canvasEle: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  canvasCalibEle: HTMLCanvasElement;
  calibCtx: CanvasRenderingContext2D;
  isVideoReady: boolean;
  model: any;
  cnt: number;
  xNormal: number;
  xNormalRaw: number;
  yNormal: number;
  yNormalRaw: number;

  lipsOpen: number;

  eyeLOpen: number;
  eyeROpen: number;

  isCamAvailable: boolean;

  camStream: MediaStream;

  calibrationModal: bootstrap.Modal;

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.videoEle = video;
    this.isVideoReady = false;
    this.cnt = 0;

    this.canvasEle = canvas;
    this.ctx = this.canvasEle.getContext('2d');

    this.canvasEle.width = 320 * window.devicePixelRatio;
    this.canvasEle.height = 240 * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvasEle.style.width = '320px';
    this.canvasEle.style.height = '240px';
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
    this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';

    this.xNormal = 0;
    this.xNormalRaw = 0;
    this.yNormal = 0;
    this.yNormalRaw = 0;

    this.lipsOpen = 0;

    this.eyeLOpen = 0;
    this.eyeROpen = 0;

    this.isCamAvailable = false;

    this.camStream = null;
    // console.log(document.getElementById('calibration_modal'));
    this.calibrationModal = new Modal(
      document.getElementById('calibration_modal')
    );
    this.canvasCalibEle = document.querySelector('#calibration_preview');
    this.calibCtx = this.canvasCalibEle.getContext('2d');

    this.canvasCalibEle.width = 320 * window.devicePixelRatio;
    this.canvasCalibEle.height = 240 * window.devicePixelRatio;
    this.calibCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvasCalibEle.style.width = '320px';
    this.canvasCalibEle.style.height = '240px';
    this.calibCtx.strokeStyle = 'rgba(0, 255, 0, 1)';
    this.calibCtx.fillStyle = 'rgba(0, 255, 0, 1)';
    console.log('canvas calib', this.canvasCalibEle);
    // this.calibCtx.fillRect(0, 0, 100, 100);
    // this.calibrationModal.show();
  }

  closeCam() {
    if (this.videoEle.srcObject && this.camStream) {
      this.isVideoReady = false;
      this.isCamAvailable = false;
      this.camStream.getTracks().forEach(track => {
        track.stop();
      });
      this.camStream = null;
    } else {
      console.warn('[facemanager] [closeCam] No cam stream available.');
    }
  }

  openCam() {
    return new Promise<boolean>((resolve, reject) => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: {
              width: 320,
              height: 240,
              facingMode: 'user'
            }
          })
          .then((stream: MediaStream) => {
            if (this.videoEle) {
              this.camStream = stream;
              this.videoEle.srcObject = stream;
              this.videoEle.addEventListener('loadeddata', event => {
                this.isVideoReady = true;
                this.isCamAvailable = true;
                console.log('[FaceManager] [openCam] video loadeddata');
              });
              resolve(true);
            } else {
              console.warn('[FaceManager] [openCam] No video element.');
              reject(new Error('No video element'));
            }
          })
          .catch(err => {
            console.error(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
              `[FaceManager] [openCam] Cannot get stream data: ${err.message}`
            );
            reject(err);
          });
      } else {
        console.warn(
          '[FaceManager] [openCam] This browser cannot support [getUserMedia]'
        );
        reject(new Error('This browser cannot support [getUserMedia]'));
      }
    });
  }

  loadLandmarkModel() {
    return load(SupportedPackages.mediapipeFacemesh).then(model => {
      this.model = model;
      console.log('[FaceManager] [loadLandmarkModel] model loaded', this.model);
    });
  }

  // https://www.pyimagesearch.com/2017/04/24/eye-blink-detection-opencv-python-dlib/
  calcEyeAspectRatio(points: [number, number][]): number {
    //p1 ~ p6
    if (!points || points.length !== 6) return 0;

    return (
      ((this.euclideanDistance(points[1], points[5]) +
        this.euclideanDistance(points[2], points[4])) /
        2) *
      this.euclideanDistance(points[0], points[3])
    );
  }

  euclideanDistance(
    pointA: [number, number],
    pointB: [number, number]
  ): number {
    return Math.sqrt(
      Math.pow(pointA[0] - pointB[0], 2) + Math.pow(pointA[1] - pointB[1], 2)
    );
  }

  faceRect(humanFace) {
    return [
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands,@typescript-eslint/no-unsafe-member-access
      humanFace.boundingBox.topLeft[0] + humanFace.boundingBox.bottomRight[0],
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands,@typescript-eslint/no-unsafe-member-access
      humanFace.boundingBox.topLeft[1] + humanFace.boundingBox.bottomRight[1]
    ];
  }

  detectLandmark() {
    if (
      this.isVideoReady &&
      this.model &&
      this.cnt % FaceLandmarkFrameSkip === 0
    ) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
      this.model.estimateFaces({ input: this.videoEle }).then((face: any[]) => {
        if (face && face.length > 0) {
          // console.log('[FaceManager] [detectLandmark] Face', face);
          this.renderLandmark(face, this.canvasEle, this.ctx);
          this.renderLandmark(face, this.canvasCalibEle, this.calibCtx);
          // this.testRender(this.canvasCalibEle, this.calibCtx);
          this.detectFacePosition(face);
          this.detectMouthOpen(face);
          this.detectEyeLOpen(face);
          this.detectEyeROpen(face);
        } else {
          console.warn('[FaceManager] [detectLandmark] No face detected!');
        }
      });
    }
    this.cnt++;
  }

  detectFacePosition(face: any[]) {
    face.forEach(person => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      const [x, y] = person.annotations.noseTip[0];
      const [w, h] = this.faceRect(person);
      this.xNormalRaw = -(x / w - 0.5) * 10;
      this.yNormalRaw = -(y / h - 0.5) * 50;

      this.xNormal += (this.xNormalRaw - this.xNormal) / 3;
      this.yNormal += (this.yNormalRaw - this.yNormal) / 3;

      // console.log(`xRegular, yRegular: ${this.xNormal - 0.5}, ${this.yNormal - 0.5}`)
    });
  }

  detectMouthOpen(face: any[]): void {
    face.forEach(person => {
      // console.log('face', person);
      const mouthRatio = this.calcEyeAspectRatio([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[61],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[37],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[267],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[291],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[314],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[84]
      ]);
      this.lipsOpen = (mouthRatio - 1000) / 1000;

      if (this.lipsOpen > 0.5) this.lipsOpen = 1;
      else if (this.lipsOpen < 0) this.lipsOpen = 0;
      // console.log(`[FaceManager] [detectMouthOpen] mouthRatio: ${mouthRatio}`);
    });
  }

  detectEyeLOpen(face: any[]) {
    face.forEach(person => {
      // console.log('face', person);

      const eyeRatio = this.calcEyeAspectRatio([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[263],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[387],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[385],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[362],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[380],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[373]
      ]);
      this.eyeLOpen = (eyeRatio - 150) / 50;

      if (this.eyeLOpen > 0.5) this.eyeLOpen = 1;
      else if (this.eyeLOpen < 0) this.eyeLOpen = 0;
      // console.log(`[FaceManager] [detectEyeLOpen] eyeRatio: ${eyeRatio}, this.eyeROpen: ${this.eyeLOpen}`);
      // console.log(`[FaceManager] [detectEyeLOpen] up: ${eyeUpperY}, low: ${eyeLowerY}, diff: ${eyeLowerY - eyeUpperY}, ratio: ${((eyeLowerY - eyeUpperY) / h * 1000)}, isOpen: ${this.eyeLOpen}`);
    });
  }

  detectEyeROpen(face: any[]) {
    face.forEach(person => {
      // console.log('face', person);

      const eyeRatio = this.calcEyeAspectRatio([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[33],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[160],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[158],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[133],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[153],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.scaledMesh[144]
      ]);
      this.eyeROpen = (eyeRatio - 150) / 50;

      if (this.eyeROpen > 0.5) this.eyeROpen = 1;
      else if (this.eyeROpen < 0) this.eyeROpen = 0;
      // console.log(`[FaceManager] [detectEyeROpen] eyeRatio: ${eyeRatio}, this.eyeROpen: ${this.eyeROpen}`);
      // console.log(`[FaceManager] [detectEyeROpen] up: ${eyeUpperY}, low: ${eyeLowerY}, diff: ${eyeLowerY - eyeUpperY}, ratio: ${((eyeLowerY - eyeUpperY) / h * 1000)}, isOpen: ${this.eyeROpen}`);
    });
  }

  renderLandmark(
    face: any[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    face.forEach(person => {
      ctx.strokeRect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.boundingBox.topLeft[0],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.boundingBox.topLeft[1],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.boundingBox.bottomRight[0] - person.boundingBox.topLeft[0],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        person.boundingBox.bottomRight[1] - person.boundingBox.topLeft[1]
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      person.scaledMesh.forEach((xyz: number[]) => {
        ctx.strokeRect(xyz[0], xyz[1], 1, 1);
        // ctx.arc(xyz[0], xyz[1], 2, 0, Math.PI * 2, true);
        ctx.beginPath();
        ctx.arc(xyz[0], xyz[1], 1, 0, 2 * Math.PI);
        ctx.stroke();
      });
    });
  }

  testRender(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, 100, 100);
  }
}
