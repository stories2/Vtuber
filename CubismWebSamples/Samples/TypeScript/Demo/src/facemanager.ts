import '@tensorflow/tfjs-backend-webgl';
import {
  load,
  SupportedPackages
} from '@tensorflow-models/face-landmarks-detection';
import { FaceLandmarkFrameSkip } from './lappdefine';
import { LandMarkAnnotations } from './models/facelandmark';
import { Modal } from 'bootstrap';

interface MLR_MODEL {
  alpha0: number;
  alpha1: number;
  beta: number;
}

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
  calibrationComment = [
    '#1 Come close, open your eyes, and open your mouth.',
    '#2 Come close, close your eyes, and close your mouth.',
    '#3 Open your eyes from afar and open your mouth.',
    '#4 Close your eyes from afar and close your mouth.'
  ];

  lastFaceData: any[];
  caliFaceDataArray: any[];

  leftEyeModel: MLR_MODEL;
  rightEyeModel: MLR_MODEL;
  mouthModel: MLR_MODEL;

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

    this.caliFaceDataArray = [];

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

    this.caliComment(this.caliFaceDataArray.length);
    document
      .querySelector('#calibration_submit')
      .addEventListener('click', e => this.handleFaceRecorder(e));
    this.leftEyeModel = {
      alpha0: 0.0010671667440820595,
      alpha1: 0.0013861827921983934,
      beta: 0.000005869564047799215
    };
    this.rightEyeModel = {
      alpha0: 0.0010657022796119406,
      alpha1: 0.001381456525117074,
      beta: 0.000005857769237020925
    };
    this.mouthModel = {
      alpha0: 0.002651445482738079,
      alpha1: 0.0011421755006483195,
      beta: 0.000005045844306037698
    };
  }
  // 0:
  // eyeLRatio: 78.52242284433814
  // eyeRRatio: 98.95066135513706
  // faceRect: (2) [311.54992690458096, 299.6179553579644]
  // faceSize: 93345.9520910738
  // mouthRatio: 1022.6002651900551
  // 1:
  // eyeLRatio: 56.919258715275724
  // eyeRRatio: 88.26489912216785
  // faceRect: (2) [314.0681601514654, 301.510142858466]
  // faceSize: 94694.73583456391
  // mouthRatio: 590.7874228473529
  // 2:
  // eyeLRatio: 27.396415044239635
  // eyeRRatio: 30.071441098947883
  // faceRect: (2) [309.2361478243234, 304.5183100490239]
  // faceSize: 94168.0691415331
  // mouthRatio: 530.0502667257222
  // 3:
  // eyeLRatio: 18.145879469422393
  // eyeRRatio: 20.266221219651488
  // faceRect: (2) [315.9929231310604, 304.51370065116237]
  // faceSize: 96224.1744022175
  // mouthRatio: 202.9725724507667
  caliComment(idx: number) {
    document.querySelector(
      'p#calibration_info'
    ).textContent = this.calibrationComment[idx];
  }

  // closer face with
  // - open eyes, open mouth
  // - close eyes, close mouth
  // faraway face with
  // - open eyes, open mouth
  // - close eyes, close mouth
  handleFaceRecorder(e) {
    if (this.caliFaceDataArray.length >= 4) {
      this.caliFaceDataArray.length = 0;
    }
    if (this.lastFaceData && this.lastFaceData.length > 0) {
      this.caliFaceDataArray.push(this.lastFaceData[0]);
      console.log(
        'event',
        e,
        'face',
        this.lastFaceData[0],
        this.caliFaceDataArray.length
      );
    }
    // Ready for calibration
    if (this.caliFaceDataArray.length >= 4) {
      const data = this.calibrateFaceDetection();
      const eyeLModel = this.multiLinearRegression(
        data.map(item => {
          return {
            a: item.eyeLRatio,
            b: item.faceRect[0]
          };
        }),
        [1, 0, 1, 0]
      );
      const eyeRModel = this.multiLinearRegression(
        data.map(item => {
          return {
            a: item.eyeRRatio,
            b: item.faceRect[0]
          };
        }),
        [1, 0, 1, 0]
      );
      const mouthModel = this.multiLinearRegression(
        data.map(item => {
          return {
            a: item.mouthRatio / 10,
            b: item.faceRect[0]
          };
        }),
        [1, 0, 1, 0]
      );
      this.leftEyeModel = {
        alpha0: eyeLModel.alpha[0],
        alpha1: eyeLModel.alpha[1],
        beta: eyeLModel.beta
      };
      this.rightEyeModel = {
        alpha0: eyeRModel.alpha[0],
        alpha1: eyeRModel.alpha[1],
        beta: eyeRModel.beta
      };
      this.mouthModel = {
        alpha0: mouthModel.alpha[0],
        alpha1: mouthModel.alpha[1],
        beta: mouthModel.beta
      };
    }
    this.caliComment(this.caliFaceDataArray.length % 4);
  }

  calibrateFaceDetection() {
    const data = this.caliFaceDataArray.map(face => {
      const rect = this.faceRect(face);
      return {
        eyeLRatio: this.calcEyeAspectRatio([
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[263],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[387],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[385],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[362],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[380],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[373]
        ]),
        eyeRRatio: this.calcEyeAspectRatio([
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[33],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[160],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[158],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[133],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[153],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[144]
        ]),
        mouthRatio: this.calcEyeAspectRatio([
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[61],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[37],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[267],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[291],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[314],
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          face.scaledMesh[84]
        ]),
        faceRect: rect,
        faceSize: rect[0] * rect[1]
      };
    });
    console.log(data);
    return data;
  }

  multiLinearRegression(xData: any[], yData: number[]) {
    if (
      xData.length <= 0 ||
      Object.keys(xData[0]).length <= 0 ||
      xData.length !== yData.length
    ) {
      return;
    }
    // console.log(
    //   'Object.keys(xData[0])',
    //   Object.keys(xData[0]),
    //   Object.keys(xData[0]).length
    // );
    const alpha = new Array(Object.keys(xData[0]).length).fill(0);
    let beta = 0;
    const yPred = new Array(yData.length).fill(0);
    const yError = new Array(yData.length).fill(0);

    const lr = 0.000002;
    const epochs = 100;

    new Array(epochs).fill(undefined).forEach((_, step) => {
      yPred.forEach((_, idx) => {
        yPred[idx] = 0;
        yError[idx] = 0;
      });
      // console.log('reset', yPred, yError);

      xData.forEach((xDataMultiParams, idx) => {
        Object.keys(xDataMultiParams).forEach((key, keyIdx) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          yPred[idx] += alpha[keyIdx] * xDataMultiParams[key];
        });
      });
      // console.log('yPred calc alpha', yPred);

      yPred.forEach((_, idx) => {
        yPred[idx] += beta;
        yError[idx] = yData[idx] - yPred[idx];
      });
      // console.log('yPred calc beta', yPred);
      // console.log('yError', yError);

      const aDiff = new Array(Object.keys(xData[0]).length).fill(0);
      xData.forEach((xDataMultiParams, idx) => {
        Object.keys(xDataMultiParams).forEach((key, keyIdx) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          aDiff[keyIdx] += xDataMultiParams[key] * yError[idx];
        });
      });
      aDiff.forEach((_, idx) => {
        aDiff[idx] *= -(2 / xData.length);
      });
      // console.log('aDiff', aDiff);

      const bDiff =
        -(2 / yData.length) * yError.reduce((p: number, c: number) => p + c);
      // console.log('bDiff', bDiff);

      alpha.forEach((_, idx) => {
        alpha[idx] -= lr * aDiff[idx];
      });
      beta -= lr * bDiff;
      // console.log('alpha', alpha, 'beta', beta);

      // if (step % 10 === 0) console.log(`#${step}: `, aDiff, alpha, bDiff, beta);
    });
    // console.log(`#F: `, alpha, beta);
    return {
      alpha,
      beta
    };
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
    this.videoEle.style.opacity = `0`;
  }

  openCam() {
    if (confirm('With testing cam?')) {
      this.videoEle.style.opacity = `1`;
    }
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
          this.lastFaceData = face;
          // this.renderLandmark(face, this.canvasEle, this.ctx);
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
      const rect = this.faceRect(person);
      this.lipsOpen =
        this.mouthModel.alpha0 * mouthRatio +
        this.mouthModel.alpha1 * rect[0] +
        this.mouthModel.beta;

      // if (this.lipsOpen > 0.5) this.lipsOpen = 1;
      // else if (this.lipsOpen < 0) this.lipsOpen = 0;
      // console.log(
      //   `[FaceManager] [detectMouthOpen] mouthRatio: ${this.lipsOpen}`
      // );
      document.querySelector(
        'span#mouth'
      ).textContent = `${this.lipsOpen.toFixed(2)}`;
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
      const rect = this.faceRect(person);
      this.eyeLOpen =
        this.leftEyeModel.alpha0 * eyeRatio +
        this.leftEyeModel.alpha1 * rect[0] +
        this.leftEyeModel.beta;

      // if (this.eyeLOpen > 0.5) this.eyeLOpen = 1;
      // else if (this.eyeLOpen < 0) this.eyeLOpen = 0;
      // console.log(
      //   `[FaceManager] [detectEyeLOpen] this.eyeROpen: ${this.eyeLOpen}`
      // );
      document.querySelector(
        'span#lefteye'
      ).textContent = `${this.eyeLOpen.toFixed(2)}`;
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
      const rect = this.faceRect(person);
      this.eyeROpen =
        this.rightEyeModel.alpha0 * eyeRatio +
        this.rightEyeModel.alpha1 * rect[0] +
        this.rightEyeModel.beta;

      // if (this.eyeROpen > 0.5) this.eyeROpen = 1;
      // else if (this.eyeROpen < 0) this.eyeROpen = 0;
      // console.log(
      //   `[FaceManager] [detectEyeROpen] this.eyeROpen: ${this.eyeROpen}`
      // );
      document.querySelector(
        'span#righteye'
      ).textContent = `${this.eyeROpen.toFixed(2)}`;
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
