const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerHeight;
canvas.height = window.innerHeight;

//canvas.height = window.innerHeight;

window.canvas = canvas;
window.ctx = ctx;

window.manualDirection = {
    brake: false,
    w: false,
    a: false,
    s: false,
    d: false
};

window.clickState = {
    startX: null,
    startY: null,
    mode: 'segment'
};

document.addEventListener('keydown', (e) => {
    if (e.shiftKey) manualDirection.brake = true;
    if (e.key.toLowerCase() === 'w') manualDirection.w = true;
    if (e.key.toLowerCase() === 'a') manualDirection.a = true;
    if (e.key.toLowerCase() === 's') manualDirection.s = true;
    if (e.key.toLowerCase() === 'd') manualDirection.d = true;

    if (e.key.toLowerCase() === 'c') {
        {
            clickState.startX = null;
            clickState.startY = null;

            switch (clickState.mode) {
                case "segment":
                    clickState.mode = "checkpoint";
                    break;
                case "checkpoint":
                    clickState.mode = "segment";
                    break;
            }
        }
    }

    if (e.key.toLowerCase() === "f") {
        clickState.startX = null;
        clickState.startY = null;

        clickState.mode = "startFinish"
    }
});

document.addEventListener('keyup', (e) => {
    if (!e.shiftKey) manualDirection.brake = false;
    if (e.key.toLowerCase() === 'w') manualDirection.w = false;
    if (e.key.toLowerCase() === 'a') manualDirection.a = false;
    if (e.key.toLowerCase() === 's') manualDirection.s = false;
    if (e.key.toLowerCase() === 'd') manualDirection.d = false;
});

window.buttons = []
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    // activate buttons

    let clickedButton = false;
    for (let button of buttons) {
        if ((x * canvas.width) >= button.x && (y * canvas.height) >= button.y && (x * canvas.width) <= button.x + button.width && (y * canvas.height) <= button.y + button.height) {
            button.func();
            clickedButton = true;
            break;
        }
    }

    if (clickedButton) return;

    // set car start position

    if (track.carStart.x == 0) {
        if (clickState.startX === null) {
            clickState.startX = x;
            clickState.startY = y;
        } else {
            track.carStart.x = x;
            track.carStart.y = y;

            let startVector = [x - clickState.startX, y - clickState.startY];
            let startMagnitude = Math.sqrt(startVector[0] * startVector[0] + startVector[1] * startVector[1]);
            let normVec = [startVector[0] / startMagnitude, startVector[1] / startMagnitude];

            //track.carStart.angle = normVec[1] * 180;//Math.acos(normVec[0]) * 180;

            clickState.startX = null;
            clickState.startY = null;
        }

        return;
    }

    if (clickState.startX === null) {
        clickState.startX = x;
        clickState.startY = y;
    } else {
        switch (clickState.mode) {
            case "segment":
                track.segments.push({ x1: clickState.startX, x2: x, y1: clickState.startY, y2: y });

                clickState.startX = x;
                clickState.startY = y;
                break;
            case "checkpoint":
                track.checkpoints.push({ x1: clickState.startX, x2: x, y1: clickState.startY, y2: y });

                clickState.startX = null;
                clickState.startY = null;
                break;
            case "startFinish":
                track.startFinish = { x1: clickState.startX, x2: x, y1: clickState.startY, y2: y };

                finalizeTrack();
                break;
        }
    }
});

function finalizeTrack() {
    console.log('Track data:', JSON.stringify(track, null, 2));
}

function makeButton(text, x, y, func) {
    let textSize = ctx.measureText(text);

    buttons.push({
        text,
        textY: y,
        x: x,
        y: y - textSize.actualBoundingBoxAscent - 5,
        width: textSize.width + 40,
        height: textSize.actualBoundingBoxDescent + textSize.actualBoundingBoxAscent + 10,
        func
    })
}

function drawButton(button) {
    ctx.fillText(button.text, button.x + 20, button.textY);

    ctx.strokeStyle = `orange`;
    ctx.lineWidth = 2;

    ctx.strokeRect(
        button.x,
        button.y,
        button.width,
        button.height
    );
}


function draw(raycasts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Segments

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;

    track.segments.forEach(segment => {
        ctx.beginPath();

        ctx.lineTo(segment.x1 * canvas.width, segment.y1 * canvas.height);
        ctx.lineTo(segment.x2 * canvas.width, segment.y2 * canvas.height);

        ctx.stroke();
    });

    // Start/Finish line

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    if (track.startFinish.x1 !== undefined && track.startFinish.y1 !== undefined) {
        ctx.beginPath();

        ctx.moveTo(track.startFinish.x1 * canvas.width, track.startFinish.y1 * canvas.height);
        ctx.lineTo(track.startFinish.x2 * canvas.width, track.startFinish.y2 * canvas.height);

        ctx.stroke();
    }

    // Draw checkpoints

    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 3;

    track.checkpoints.forEach(checkpoint => {
        ctx.beginPath();

        ctx.lineTo(checkpoint.x1 * canvas.width, checkpoint.y1 * canvas.height);
        ctx.lineTo(checkpoint.x2 * canvas.width, checkpoint.y2 * canvas.height);

        ctx.stroke();
    });

    // Draw starting point of the car

    ctx.fillStyle = 'orange';
    if (track.carStart.x !== undefined && track.carStart.y !== undefined) {
        ctx.beginPath();
        ctx.arc(track.carStart.x * canvas.width, track.carStart.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw the raycasts

    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 1;

    raycasts.forEach(raycast => {
        ctx.beginPath();

        ctx.lineTo(raycast.x1 * canvas.width, raycast.y1 * canvas.height);
        ctx.lineTo(raycast.x2 * canvas.width, raycast.y2 * canvas.height);

        ctx.stroke();
    });


    // Draw car

    const rad = car.angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const halfWidth = car.width / 2
    const halfHeight = car.height / 2;


    const x1 = car.x + (-halfWidth * cos - -halfHeight * sin);
    const y1 = car.y + (-halfWidth * sin + -halfHeight * cos);

    const x2 = car.x + (halfWidth * cos - -halfHeight * sin);
    const y2 = car.y + (halfWidth * sin + -halfHeight * cos);

    const x3 = car.x + (halfWidth * cos - halfHeight * sin);
    const y3 = car.y + (halfWidth * sin + halfHeight * cos);

    const x4 = car.x + (-halfWidth * cos - halfHeight * sin);
    const y4 = car.y + (-halfWidth * sin + halfHeight * cos);


    ctx.beginPath();
    ctx.moveTo(x1 * canvas.width, y1 * canvas.height);
    ctx.lineTo(x2 * canvas.width, y2 * canvas.height);
    ctx.lineTo(x3 * canvas.width, y3 * canvas.height);
    ctx.lineTo(x4 * canvas.width, y4 * canvas.height);
    ctx.closePath();

    ctx.fillStyle = 'purple';
    ctx.fill();
}

function drawStatistics() {
    ctx.font = "24px serif";
    ctx.fillStyle = 'orange';

    ctx.fillText(`Episode: ${window.brains.episode}`, 20, 50);
    ctx.fillText(`Epsilon: ${brains.epsilon.toFixed(2)}`, 20, 80);
    ctx.fillText(`Current Episode Reward: ${episodeReward.toFixed(1)}`, 20, 110);
    ctx.fillText(`Biggest Episode Reward: ${(episodes[bestEpisode] || 0).toFixed(1)}`, 20, 140);

    for (let button of buttons) {
        drawButton(button)
    }
}

ctx.font = "24px serif";
makeButton(`Change speed`, 20, 180, () => {
  isFast = !isFast;
});

makeButton(`Stop/Continue exploring`, 250, 180, () => {
  isExploring = !isExploring;
});

makeButton(`Manual Driving`, 600, 180, () => {
    manualDrive = !manualDrive;
  });

window.draw = draw;
window.finalizeTrack = finalizeTrack;
window.drawStatistics = drawStatistics;
window.makeButton = makeButton;
window.drawButton = drawButton;