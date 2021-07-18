import faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'

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

    detectLandmark() {
        faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh)
        // Pass in a video stream to the model to obtain an array of detected faces from the MediaPipe graph.
        // For Node users, the `estimateFaces` API also accepts a `tf.Tensor3D`, or an ImageData object.
        .then(model => model.estimateFaces({ input: this.videoEle }))
        .then(face => {
            if (face && face.length > 0) {
                console.log('Face', face);
            } else {
                console.warn('No face detected!');
            }
        })
    }
}