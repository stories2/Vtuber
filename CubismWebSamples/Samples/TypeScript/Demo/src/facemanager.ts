import '@tensorflow/tfjs-backend-webgl';
import { load, SupportedPackages } from '@tensorflow-models/face-landmarks-detection'
import { FaceLandmarkFrameSkip } from './lappdefine';

export class FaceManager {

    videoEle: HTMLVideoElement;
    isVideoReady: Boolean;
    model: any;
    cnt: number;

    constructor(video: HTMLVideoElement) {
        this.videoEle = video;
        this.isVideoReady = false;
        this.cnt = 0;
    }

    openCam() {
        return new Promise<Boolean>((resolve, reject) => {
            if(navigator.mediaDevices.getUserMedia) {
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

    detectLandmark() {
        if (this.isVideoReady && this.model && this.cnt % FaceLandmarkFrameSkip === 0) {
            this.model.estimateFaces({ input: this.videoEle })
            .then(face => {
                if (face && face.length > 0) {
                    // console.log('[FaceManager] [detectLandmark] Face', face);
                } else {
                    console.warn('[FaceManager] [detectLandmark] No face detected!');
                }
            })
        }
        this.cnt ++;
    }
}