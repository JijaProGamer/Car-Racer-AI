async function importTrack() {
    return await (await fetch("track.json")).json();
}

function actionToDirection(action) {
    action = actions[action];
    let isShifting = action.startsWith("shift+");
    if (isShifting) {
        action = action.substring("shift+".length);
    }

    return {
        brake: isShifting,
        w: action.includes("w"),
        a: action.includes("a"),
        s: action.includes("s"),
        d: action.includes("d")
    }
}

function calculateCarFront(){
    let angleRad = car.angle * Math.PI / 180;

    let dx = (car.height / 2) * Math.cos(angleRad);
    let dy = (car.height / 2) * Math.sin(angleRad);

    return { 
        x: car.x + dx, 
        y: car.y + dy 
    };
}

function findSpawnPoint(numRays) {
    while (true) {
        let randomX = Math.random();
        let randomY = Math.random();

        let checkpointsFound = 0;
        let furthestRay = null;
        let canContinue = true;
        const angleIncrement = 360 / numRays;

        for (let i = 0; i < numRays; i++) {
            const angle = i * angleIncrement + car.angle;
            const rad = angle * Math.PI / 180;

            let raycast = raycastFromCar({
                x1: randomX,
                y1: randomY,
                direction1: Math.cos(rad),
                direction2: Math.sin(rad),
            });

            if ((raycast.distance < car.width && raycast.distance < car.height) || raycast.intersectionType == "wall") {
                canContinue = false;
                break;
            }

            if (!furthestRay || raycast.distance > furthestRay.distance) {
                furthestRay = { ...raycast, angle };
            }

            let checkpointRaycast = raycastFromCar({
                x1: randomX,
                y1: randomY,
                direction1: Math.cos(rad),
                direction2: Math.sin(rad),
            }, "checkpoints");

            if (checkpointRaycast.intersectionType == "checkpoint") {
                checkpointsFound += 1;
            }
        }

        if (!canContinue || checkpointsFound < numRays / 4) {
            continue;
        }

        //let angle = Math.atan2()
        //let angle = furthestRay.angle;

        /*if(!((angle >= 250 && angle <= 360) || (angle >= 0 && angle <= 110))){
            continue;
        }*/


        let closestCheckpoint = calculateClosestCheckpointDistance({ x: randomX, y: randomY });
    
        if(closestCheckpoint.smallestIndex == track.checkpoints.length - 1){
          continue;
        }
    
        let currentCheckpoint = track.checkpoints[closestCheckpoint.smallestIndex];
        let nextCheckpoint = track.checkpoints[closestCheckpoint.smallestIndex + 1];
    
        let angle = getAngle(
            { x: (currentCheckpoint.x1 + currentCheckpoint.x2) / 2, 
              y: (currentCheckpoint.y1 + currentCheckpoint.y2) / 2 
            },
            { x: (nextCheckpoint.x1 + nextCheckpoint.x2) / 2, 
              y: (nextCheckpoint.y1 + nextCheckpoint.y2) / 2 
            }
        );

        return {
            x: randomX,
            y: randomY,
            angle,
            checkpoint: closestCheckpoint.smallestIndex
        };
    }
}

function raycastFromCar(ray, mode = "segments") {
    let minDist = Infinity;
    let intersectionType;

    track.segments.forEach(segment => {
        const intersectPoint = rayIntersectsLine(ray, { x1: segment.x1, x2: segment.x2, y1: segment.y1, y2: segment.y2 });

        if (intersectPoint && intersectPoint.distance < minDist) {
            minDist = intersectPoint.distance;
            intersectionType = "segment"
        }
    });

    if (mode == "checkpoints") {
        track.checkpoints.forEach(checkpoint => {
            const intersectPoint = rayIntersectsLine(ray, { x1: checkpoint.x1, x2: checkpoint.x2, y1: checkpoint.y1, y2: checkpoint.y2 });

            if (intersectPoint && intersectPoint.distance < minDist) {
                minDist = intersectPoint.distance;
                intersectionType = "checkpoint"
            }
        });
    }

    [
        { x1: 0, y1: 0, x2: 1, y2: 0 },
        { x1: 0, y1: 1, x2: 1, y2: 1 },
        { x1: 0, y1: 0, x2: 0, y2: 1 },
        { x1: 1, y1: 0, x2: 1, y2: 1 }
    ].forEach(segment => {
        const intersectPoint = rayIntersectsLine(ray, segment);

        if (intersectPoint && intersectPoint.distance < minDist) {
            minDist = intersectPoint.distance;
            intersectionType = "wall";
        }
    });

    let endX = ray.x1 + ray.direction1 * minDist;
    let endY = ray.y1 + ray.direction2 * minDist;

    return {
        distance: minDist,
        x1: car.x,
        y1: car.y,
        x2: endX,
        y2: endY,
        intersectionType
    };
}

function doRaycasts(numRays) {
    const rays = [];
    const angleIncrement = 360 / numRays;

    for (let i = 0; i < numRays; i++) {
        const angle = i * angleIncrement + car.angle;
        const rad = angle * Math.PI / 180;

        rays.push(raycastFromCar({
            x1: car.x,
            y1: car.y,
            direction1: Math.cos(rad),
            direction2: Math.sin(rad)
        }));
    }

    return rays;
}

function carIntersectsSegments() {
    let intersects = false;

    for (let segment of track.segments) {
        if (lineIntersectsBox(car, segment)) {
            intersects = true;
            break;
        }
    }

    return intersects;
}

/*function calculateClosestCheckpointDistance() {
    let smallestDistance = Infinity;
    let smallestIndex = -1;

    for (let [index, checkpoint] of track.checkpoints.entries()) {
        let distance = getMinDistanceBoxToLine(car, checkpoint);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            smallestIndex = index;
            break;
        }
    }

    return { smallestDistance, smallestIndex };
}*/

function calculateClosestCheckpointDistance(point) {
    let smallestDistance = Infinity;
    let smallestIndex = -1;

    for (let [index, checkpoint] of track.checkpoints.entries()) {
        let distance = getDistance(point.x, point.y, (checkpoint.x1 + checkpoint.x2) / 2, (checkpoint.y1 + checkpoint.y2) / 2);

        if (distance < smallestDistance) {
            smallestDistance = distance;
            smallestIndex = index;
        }
    }

    return { smallestDistance, smallestIndex };
}

function carIntersectsCheckpoints() {
    let intersects = -1;

    for (let [index, checkpoint] of track.checkpoints.entries()) {
        if (lineIntersectsBox(car, checkpoint)) {
            intersects = index;
            break;
        }
    }

    return intersects;
}

function carIntersectsFinish() {
    return lineIntersectsBox(car, track.startFinish);
}

function carDistanceToCheckpoint(checkpoint) {
    const carMiddle = calculateCarFront();
    const checkpointMiddle = { x: (checkpoint.x1 + checkpoint.x2) / 2, y: (checkpoint.y1 + checkpoint.y2) / 2 }

    return getDistance(carMiddle.x, carMiddle.y, checkpointMiddle.x, checkpointMiddle.y);
}

function getPathDistance(){
    //const carMiddle = calculateCarFront();

    let closestPath = -1;
    let closestPathDistance = Infinity;

    for(let [index, path] of track.path.entries()){
        //let distanceToPath = distanceFromPointToLine(car, path);
        let distanceToPath = getDistance(car.x, car.y, (path.x1 + path.x2) / 2, (path.y1 + path.y2) / 2);
        if(distanceToPath < closestPathDistance){
            closestPath = index;
            closestPathDistance = distanceToPath;
        }
    }

    let distanceAccumulated = closestPathDistance;
    for(let i = 0; i < closestPath; i++){
        let path = track.path[i];
        distanceAccumulated += getDistance(path.x1, path.y1, path.x2, path.y2);
    }

    return distanceAccumulated;
}

window.getPathDistance = getPathDistance;
window.carIntersectsCheckpoints = carIntersectsCheckpoints;
window.importTrack = importTrack;
window.carIntersectsFinish = carIntersectsFinish;
window.calculateClosestCheckpointDistance = calculateClosestCheckpointDistance;
window.carIntersectsSegments = carIntersectsSegments;
window.doRaycasts = doRaycasts;
window.actionToDirection = actionToDirection;
window.findSpawnPoint = findSpawnPoint;
window.carDistanceToCheckpoint = carDistanceToCheckpoint;