window.track = await importTrack();

//window.actions = ["w", "wa", "wd", "s", "sa", "sd", "shift+w", "shift+wa", "shift+wd", "shift+s", "shift+sa", "shift+sd"]
window.actions = ["w", "wa", "wd"/*, "shift+w", "shift+wa", "shift+wd"*/]

window.car = {
    x: track.carStart.x,
    y: track.carStart.y,
    width: 35 / canvas.width,
    height: 20 / canvas.height,
    angle: track.carStart.angle,
    speed: 0,
    maxSpeed: 3,
    acceleration: 0.03,
    friction: 0.2,
    turnSpeed: 4
};

window.isFast = false;
window.isExploring = true;
window.manualDrive = false;

window.forceExploit = false;

window.lastState = null
window.moveData = {
    lastCheckpoint: -1
}

window.stepsTotal = 0;
window.steps = 0;
window.episodeReward = 0;
window.episode = 0;

window.trainsPerEpisode = 10;
window.episodesPerUpdate = 50;
window.episodesPerExploit = 500;
window.episodesUsingExploit = 500; 

window.bestEpisode = -1;
window.episodes = []

function updateCar(direction) {
    if (direction.w) {
        if (!direction.brake) {
            car.speed += car.acceleration / 2;
        } else {
            car.speed += car.acceleration;
        }
    } else if (direction.s) {
        if (!direction.brake) {
            car.speed -= car.acceleration / 2;
        } else {
            car.speed -= car.acceleration;
        }
    } else {
        if (car.speed > 0) {
            car.speed -= car.friction;
            if (car.speed < 0) car.speed = 0;
        }
        if (car.speed < 0) {
            car.speed += car.friction;
            if (car.speed > 0) car.speed = 0;
        }
    }

    if (direction.brake) {
        if (car.speed > car.maxSpeed / 2) car.speed = car.maxSpeed / 2;
        if (car.speed < -car.maxSpeed / 2) car.speed = -car.maxSpeed / 2;
    } else {
        if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
        if (car.speed < -car.maxSpeed) car.speed = -car.maxSpeed;
    }

    if (direction.a) {
        car.angle -= car.turnSpeed * (car.speed / car.maxSpeed);

        if (car.angle < 0) {
            car.angle = 360 - car.angle % 360;
        }
    }
    if (direction.d) {
        car.angle += car.turnSpeed * (car.speed / car.maxSpeed);

        if (car.angle > 360) {
            car.angle = car.angle % 360;
        }
    }

    car.x += Math.cos(car.angle * Math.PI / 180) * car.speed / canvas.width;
    car.y += Math.sin(car.angle * Math.PI / 180) * car.speed / canvas.height;
}

function calculateEnvironment(raycasts) {
    let environment = [
        (((car.angle / 57.2957914331)) % (2 * Math.PI)) / (2 * Math.PI),
        car.speed / car.maxSpeed
    ];

    for (let raycast of raycasts) {
        environment.push(raycast.distance * 5); // normalize
    }

    return environment
}


function calculateRewards(raycasts) {
    raycasts = [...raycasts];
    let smallestRaycast = raycasts.sort((a, b) => a.distance - b.distance).shift().distance;
    //let reward = -((0.1 - smallestRaycast) / 10) / 2;
    //let reward = -0.01;
    let reward = 0;
    //let reward = Math.pow(3, smallestRaycast * 100) / 32 / 80;

    let checkpointIntersected = carIntersectsCheckpoints();
    if (checkpointIntersected > -1) {
        //if (checkpointIntersected != moveData.lastCheckpoint) {
        if (checkpointIntersected == moveData.lastCheckpoint + 1) {
            moveData.lastCheckpoint = checkpointIntersected;

            let checkpoint = track.checkpoints[checkpointIntersected];
            let distanceToCenter = carDistanceToCheckpoint(checkpoint);
            let checkpointSize = getDistance(checkpoint.x1, checkpoint.y1, checkpoint.x2, checkpoint.y2);
            //let angle = getAngle({ x: (checkpoint.x1 + checkpoint.x2) / 2, y: (checkpoint.y1 + checkpoint.y2) / 2 }, { x: car.x, y: car.y })

            reward += Math.min(Math.max(checkpointSize / distanceToCenter, 1), 10) / 10;
        }
    }

    if (carIntersectsFinish() && moveData.lastCheckpoint == track.checkpoints.length - 1) {
        moveData.lastCheckpoint = -1;
        reward += 1; // 5
    }

    return reward;
}

window.lastPathDistance = 0;
/*function calculateRewards() {
    let closestPath = getPathDistance();
    let reward = 0;

    let delta = closestPath - lastPathDistance;
    reward = Math.abs(delta) * 500;

    lastPathDistance = closestPath;
    return reward;
}*/

async function resetEnvironment(state, action, isIntersection) {
    //let carSpawnpoint = findSpawnPoint(24);
    //track.carStart = carSpawnpoint;
    //car.x = carSpawnpoint.x;
    //car.y = carSpawnpoint.y;
    //moveData.lastCheckpoint = carSpawnpoint.checkpoint;
    //car.angle = carSpawnpoint.angle;
    //car.speed = Math.random() * car.maxSpeed;

    car.x = track.carStart.x;
    car.y = track.carStart.y;
    car.angle = track.carStart.angle;
    car.speed = 0;
    moveData.lastCheckpoint = -1;




    if (isIntersection) {
        brains.memory.add({ state: state, nextState: state, reward: -1, done: true, action })
    } else {
        brains.memory.add({ state: state, nextState: state, reward: 0, done: true, action })
    }

    //moveData = {
    //    lastCheckpoint: -1
    //}

    steps = 0;
    lastPathDistance = 0;

    onEnvironmentReset();

    if (episode % episodesPerUpdate == 0) {
        brains.updateTargetModel();
    }

    episodeReward = 0;
}

window.updateCar = updateCar;
window.calculateEnvironment = calculateEnvironment;
window.calculateRewards = calculateRewards;
window.resetEnvironment = resetEnvironment;