import { TouchManager } from "./touchmanager";

export class InterfaceManager {
    canvasEle: HTMLCanvasElement;

    moveSwitch: HTMLElement;
    btnZoomIn: HTMLButtonElement;
    btnZoomOut: HTMLButtonElement;

    isMoveEnabled: boolean;
    isMove: boolean;
    lastX: number;
    lastY: number;

    posX: number;
    posY: number;
    scale: number;

    touchManager: TouchManager;

    constructor(canvasEle: HTMLCanvasElement, touchManager: TouchManager) {
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

        this.moveSwitch = document.querySelector('div.pos-move-switch');
        this.btnZoomIn = document.querySelector('button.btn-zoom-in');
        this.btnZoomOut = document.querySelector('button.btn-zoom-out');

        this.initEvent();
    }

    initEvent() {
        this.canvasEle.addEventListener('touchstart', (e) => this.moveStart(e.touches[0].clientX, e.touches[0].clientY))
        this.canvasEle.addEventListener('touchmove', (e) => this.movePos(e.touches[0].clientX, e.touches[0].clientY));
        this.canvasEle.addEventListener('touchend', (e) => {this.isMove = false; this.saveProfile()});
        this.canvasEle.addEventListener('touchcancel', (e) => {this.isMove = false; this.saveProfile()});
        this.canvasEle.addEventListener('mousedown', (e) => this.moveStart(e.clientX, e.clientY));
        this.canvasEle.addEventListener('mousemove', (e) => this.movePos(e.clientX, e.clientY));
        this.canvasEle.addEventListener('mouseup', (e) => {this.isMove = false; this.saveProfile()});

        this.moveSwitch.addEventListener('change', (e) => this.isMoveEnabled = (e.target as any).checked);

        this.btnZoomIn.addEventListener('click', (e) => {
            if (this.scale < 3.0) {
                this.saveProfile();
                this.scale += 0.05;
            }
        });
        this.btnZoomOut.addEventListener('click', (e) => {
            if (this.scale > 0.5) {
                this.saveProfile();
                this.scale -= 0.05;
            }
        });
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