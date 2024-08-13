function getMinDistanceBoxToLine(box, line) {
    const edges = getBoxEdges(box);
    let minDistance = Infinity;

    edges.forEach(corner => {
        const dist = pointToLineDistance(
            corner.x, corner.y,
            line.x1, line.y1,
            line.x2, line.y2
        );
        if (dist < minDistance) minDistance = dist;
    });

    for (let i = 0; i < edges.length; i++) {
        const next = (i + 1) % edges.length;
        const edgeDist = pointToLineDistance(
            (line.x1 + line.x2) / 2,
            (line.y1 + line.y2) / 2,
            edges[i].x, edges[i].y,
            edges[next].x, edges[next].y
        );
        if (edgeDist < minDistance) minDistance = edgeDist;
    }

    return minDistance;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = len_sq !== 0 ? dot / len_sq : -1;

    let nearestX, nearestY;

    if (param < 0) {
        nearestX = x1;
        nearestY = y1;
    } else if (param > 1) {
        nearestX = x2;
        nearestY = y2;
    } else {
        nearestX = x1 + param * C;
        nearestY = y1 + param * D;
    }

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

function getBoxEdges(box) {
    const { x, y, width, height, angle } = box;
    const rad = angle * Math.PI / 180;

    const corners = [
        { x: -width / 2, y: -height / 2 },
        { x: width / 2, y: -height / 2 },
        { x: width / 2, y: height / 2 },
        { x: -width / 2, y: height / 2 }
    ];

    return corners.map(corner => {
        const rotatedX = corner.x * Math.cos(rad) - corner.y * Math.sin(rad) + x;
        const rotatedY = corner.x * Math.sin(rad) + corner.y * Math.cos(rad) + y;
        return { x: rotatedX, y: rotatedY };
    });
}

function linesIntersect(p1, p2, q1, q2) {
    const det = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
    if (det === 0) return false;

    const u = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / det;
    const v = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / det;

    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function lineIntersectsBox(box, line) {
    const edges = getBoxEdges(box);

    for (let i = 0; i < edges.length; i++) {
        const next = (i + 1) % edges.length;

        if (linesIntersect(
            edges[i], edges[next],
            { x: line.x1, y: line.y1 },
            { x: line.x2, y: line.y2 }
        )) {
            return true;
        }
    }

    return false;
}

function rayIntersectsLine(ray, line) {
    const { x1: rayX1, y1: rayY1, direction1: rayDX, direction2: rayDY } = ray;
    const { x1: lineX1, y1: lineY1, x2: lineX2, y2: lineY2 } = line;

    const rayDirection = { x: rayDX, y: rayDY };
    const lineDirection = { x: lineX2 - lineX1, y: lineY2 - lineY1 };

    const denominator = rayDirection.x * lineDirection.y - rayDirection.y * lineDirection.x;

    if (denominator === 0) {
        return false;
    }

    const t = ((lineX1 - rayX1) * lineDirection.y - (lineY1 - rayY1) * lineDirection.x) / denominator;
    const u = ((lineX1 - rayX1) * rayDirection.y - (lineY1 - rayY1) * rayDirection.x) / denominator;

    if (t >= 0 && u >= 0 && u <= 1) {
        const intersectionX = rayX1 + t * rayDirection.x;
        const intersectionY = rayY1 + t * rayDirection.y;

        const distance = Math.sqrt((intersectionX - rayX1) ** 2 + (intersectionY - rayY1) ** 2);

        return { distance, x: intersectionX, y: intersectionY };
    }

    return false;
}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
}

window.getDistance = getDistance;
window.rayIntersectsLine = rayIntersectsLine;
window.lineIntersectsBox = lineIntersectsBox;
window.linesIntersect = linesIntersect;
window.getBoxEdges = getBoxEdges;
window.pointToLineDistance = pointToLineDistance;
window.getMinDistanceBoxToLine = getMinDistanceBoxToLine;