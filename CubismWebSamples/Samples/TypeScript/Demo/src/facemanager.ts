import '@tensorflow/tfjs-backend-webgl';
import { load, SupportedPackages } from '@tensorflow-models/face-landmarks-detection'
import { FaceLandmarkFrameSkip } from './lappdefine';

export class FaceManager {

    videoEle: HTMLVideoElement;
    canvasEle: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    isVideoReady: Boolean;
    model: any;
    cnt: number;
    xNormal: number;
    xNormalRaw: number;
    yNormal: number;
    yNormalRaw: number;

    lipsOpen: number;

    eyeLOpen: number;
    eyeROpen: number;

    constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
        this.videoEle = video;
        this.isVideoReady = false;
        this.cnt = 0;

        this.canvasEle = canvas;
        this.ctx = this.canvasEle.getContext('2d');

        this.canvasEle.width = 640;
        this.canvasEle.height = 480;
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
        this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';

        this.xNormal = 0;
        this.xNormalRaw = 0;
        this.yNormal = 0;
        this.yNormalRaw = 0;

        this.lipsOpen = 0;

        this.eyeLOpen = 0;
        this.eyeROpen = 0;
    }

    openCam() {
        return new Promise<Boolean>((resolve, reject) => {
            if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({video: {
                    width: 640,
                    height: 480,
                    facingMode: 'environment'
                }})
                .then((stream: MediaStream) => {
                    if (this.videoEle) {
                        this.videoEle.srcObject = stream;
                        this.videoEle.addEventListener('loadeddata', (event) => {
                            this.isVideoReady = true;
                            console.log('[FaceManager] [openCam] video loadeddata');
                        })
                        resolve(true);
                    } else {
                        console.warn('[FaceManager] [openCam] No video element.');
                        reject(new Error('No video element'));
                    }
                })
                .catch(err => {
                    console.error(`[FaceManager] [openCam] Cannot get stream data: ${err.message}`);
                    reject(err);
                })
            } else {
                console.warn('[FaceManager] [openCam] This browser cannot support [getUserMedia]');
                reject(new Error('This browser cannot support [getUserMedia]'));
            }
        })
    }

    loadLandmarkModel() {
        return load(SupportedPackages.mediapipeFacemesh)
                .then(model => this.model = model)
                .then(() => console.log('[FaceManager] [loadLandmarkModel] model loaded'))
    }

    // https://www.pyimagesearch.com/2017/04/24/eye-blink-detection-opencv-python-dlib/
    calcEyeAspectRatio(points: [number, number][]): number { //p1 ~ p6
        if (!points || points.length !== 6) return 0;

        return (this.euclideanDistance(points[1], points[5]) + this.euclideanDistance(points[2], points[4])) / 2 * this.euclideanDistance(points[0], points[3]);
    }

    euclideanDistance(pointA: [number, number], pointB: [number, number]): number {
        return Math.sqrt(Math.pow(pointA[0] - pointB[0], 2) + Math.pow(pointA[1] - pointB[1], 2));
    }

    faceRect(humanFace) {
        return [humanFace.boundingBox.topLeft[0] + humanFace.boundingBox.bottomRight[0], humanFace.boundingBox.topLeft[1] + humanFace.boundingBox.bottomRight[1]]
    }

    detectLandmark() {
        if (this.isVideoReady && this.model && this.cnt % FaceLandmarkFrameSkip === 0) {
            this.model.estimateFaces({ input: this.videoEle })
            .then(face => {
                if (face && face.length > 0) {
                    // console.log('[FaceManager] [detectLandmark] Face', face);
                    this.renderLandmark(face);
                    this.detectFacePosition(face);
                    this.detectMouthOpen(face);
                    this.detectEyeLOpen(face);
                    this.detectEyeROpen(face);
                } else {
                    console.warn('[FaceManager] [detectLandmark] No face detected!');
                }
            })
        }
        this.cnt ++;
    }

    detectFacePosition(face: any) {
        face.forEach(person => {
            const [x, y, ] = person.annotations.noseTip[0];
            const [w, h] = this.faceRect(person);
            this.xNormalRaw = -(x / w - 0.5) * 10
            this.yNormalRaw = -(y / h - 0.5) * 50

            this.xNormal += (this.xNormalRaw - this.xNormal) / 3;
            this.yNormal += (this.yNormalRaw - this.yNormal) / 3;
            
            // console.log(`xRegular, yRegular: ${this.xNormal - 0.5}, ${this.yNormal - 0.5}`)
        })
    }

    detectMouthOpen(face: any) {
        face.forEach(person => {
            // console.log('face', person);

            let lipUpperY = 0x7fffffff;
            let lipLowerY = -0x7fffffff;
            const [w, h] = this.faceRect(person);
            person.annotations.lipsLowerOuter.forEach(dots => {
                if (dots[1] > lipLowerY)
                    lipLowerY = dots[1]
            });
            person.annotations.lipsUpperOuter.forEach(dots => {
                if (dots[1] < lipUpperY)
                    lipUpperY = dots[1]
            })
            this.lipsOpen = (lipLowerY - lipUpperY) / h * 20 // 0.05: open
            if (this.lipsOpen > 1)
                this.lipsOpen = 1;
            else if (this.lipsOpen < 0)
                this.lipsOpen = 0;
            // console.log(`[FaceManager] [detectMouthOpen] lower: ${lipLowerY}, upper: ${lipUpperY}, diff: ${lipLowerY - lipUpperY}, normal: ${this.lipsOpen}, ratio: ${(lipLowerY - lipUpperY) / h}`);
        })
    }

    detectEyeLOpen(face: any) {
        face.forEach(person => {
            // console.log('face', person);
            
            const eyeRatio = this.calcEyeAspectRatio([
                person.scaledMesh[263],
                person.scaledMesh[387],
                person.scaledMesh[385],
                person.scaledMesh[362],
                person.scaledMesh[380],
                person.scaledMesh[373],
            ])
            this.eyeLOpen = (eyeRatio - 150) / 50

            if (this.eyeLOpen > .5)
                this.eyeLOpen = 1;
            else if (this.eyeLOpen < 0)
                this.eyeLOpen = 0;
            // console.log(`[FaceManager] [detectEyeLOpen] eyeRatio: ${eyeRatio}, this.eyeROpen: ${this.eyeLOpen}`);
            // console.log(`[FaceManager] [detectEyeLOpen] up: ${eyeUpperY}, low: ${eyeLowerY}, diff: ${eyeLowerY - eyeUpperY}, ratio: ${((eyeLowerY - eyeUpperY) / h * 1000)}, isOpen: ${this.eyeLOpen}`);
        });
    }

    detectEyeROpen(face: any) {
        face.forEach(person => {
            // console.log('face', person);
            
            const eyeRatio = this.calcEyeAspectRatio([
                person.scaledMesh[33],
                person.scaledMesh[160],
                person.scaledMesh[158],
                person.scaledMesh[133],
                person.scaledMesh[153],
                person.scaledMesh[144],
            ])
            this.eyeROpen = (eyeRatio - 150) / 50

            if (this.eyeROpen > .5)
                this.eyeROpen = 1;
            else if (this.eyeROpen < 0)
                this.eyeROpen = 0;
            // console.log(`[FaceManager] [detectEyeROpen] eyeRatio: ${eyeRatio}, this.eyeROpen: ${this.eyeROpen}`);
            // console.log(`[FaceManager] [detectEyeROpen] up: ${eyeUpperY}, low: ${eyeLowerY}, diff: ${eyeLowerY - eyeUpperY}, ratio: ${((eyeLowerY - eyeUpperY) / h * 1000)}, isOpen: ${this.eyeROpen}`);
        });
    }

    renderLandmark(face: any) {
        this.ctx.clearRect(0, 0, this.canvasEle.width, this.canvasEle.height);
        face.forEach(person => {
            this.ctx.strokeRect(person.boundingBox.topLeft[0], person.boundingBox.topLeft[1], 
                            person.boundingBox.bottomRight[0] - person.boundingBox.topLeft[0], person.boundingBox.bottomRight[1] - person.boundingBox.topLeft[1])
            
            person.scaledMesh.forEach(xyz => {
                // ctx.strokeRect(xyz[0], xyz[1], 1, 1);
                // ctx.arc(xyz[0], xyz[1], 2, 0, Math.PI * 2, true);
                this.ctx.beginPath();
                this.ctx.arc(xyz[0], xyz[1], 1, 0, 2 * Math.PI);
                this.ctx.stroke();
            })
        })
    }
}