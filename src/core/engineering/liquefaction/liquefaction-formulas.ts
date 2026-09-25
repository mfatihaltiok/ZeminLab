export function rdAtDepth(z:number){const d=Math.max(z,0);if(d<=9.15)return 1-.00765*d;if(d<=23)return 1.174-.0267*d;if(d<=30)return .744-.008*d;return .5}
export function magnitudeCorrection(Mw:number){if(!Number.isFinite(Mw)||Mw<=0)throw new Error('Mw pozitif ve geçerli olmalıdır.');return Math.pow(10,2.24)/Math.pow(Mw,2.56)}
export function finesCorrection(fines:number){const f=Math.min(100,Math.max(0,fines));if(f<=5)return{alpha:0,beta:1};if(f<35)return{alpha:Math.exp(1.76-190/(f*f)),beta:.99+Math.pow(f,1.5)/1000};return{alpha:5,beta:1.2}}
export function crrM75(n1_60f:number){if(!Number.isFinite(n1_60f)||n1_60f<0||n1_60f>=34)return undefined;return 1/(34-n1_60f)+n1_60f/135+50/Math.pow(10*n1_60f+45,2)-1/200}
