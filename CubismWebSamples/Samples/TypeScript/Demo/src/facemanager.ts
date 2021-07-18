export class FaceManager {

    videoEle: HTMLVideoElement;

    constructor(video: HTMLVideoElement) {
        this.videoEle = video;
    }

    openCam() {
        if(navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({video: {
                width: 640,
                height: 480,
                facingMode: 'environment'
            }})
            .then((stream: MediaStream) => {
                if (this.videoEle) {
                    this.videoEle.srcObject = stream;
                }
            })
            .catch(err => {
                console.error(`Cannot get stream data: ${err.message}`);
            })
        } else {
            console.warn('This browser cannot support [getUserMedia]');
        }
    }
}