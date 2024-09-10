const { createCanvas } = require('canvas');
const fs = require('fs');

function drawCanvas(rewardsHistory, currentEpisode, width, windowSize, doLog, fileName) {
    const height = Math.round((width * 9 / 16) / 2) * 2;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const margin = 50;
    const graphWidth = width - 2 * margin;
    const graphHeight = height - 2 * margin - 100;
    const minValue = Math.min(...rewardsHistory.filter(value => value !== 0));
    const maxValue = Math.max(...rewardsHistory);
    const scaledRewards = rewardsHistory.map(value => Math.max((value - minValue) / (maxValue - minValue), 0));

    const slidingWindowRewards = [];
    for (let i = 0; i < rewardsHistory.length; i++) {
        //if(i >= (currentEpisode - windowSize)){
        //    slidingWindowRewards.push(0);
        //    continue;
        //}

        const start = Math.max(0, i - windowSize + 1);
        const window = scaledRewards.slice(start, i + 1);
        const avgReward = window.reduce((acc, r) => acc + r, 0) / window.length;
        //const avgReward = window.sort((a, b) => a - b)[Math.round(window.length / 2)];

        slidingWindowRewards.push(avgReward);
    }

    const nonZeroMin = Math.min(...slidingWindowRewards.filter(value => value > 0));
    const adjustedSlidingWindowRewards = slidingWindowRewards.map(value => value === 0 ? nonZeroMin : value);

    const transformedSlidingWindowRewards = doLog
        ? adjustedSlidingWindowRewards.map(value => Math.log10(Math.max(value, Number.MIN_VALUE)))
        : adjustedSlidingWindowRewards;

    const minTransformedValue = Math.min(...transformedSlidingWindowRewards);
    const maxTransformedValue = Math.max(...transformedSlidingWindowRewards);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, height - margin - 100);
    ctx.lineTo(margin, margin);
    ctx.moveTo(margin, height - margin - 100);
    ctx.lineTo(width - margin, height - margin - 100);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(192, 75, 192, 1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    transformedSlidingWindowRewards.forEach((value, index) => {
        const x = margin + (index / (transformedSlidingWindowRewards.length - 1)) * graphWidth;
        const y = margin + ((maxTransformedValue - value) / (maxTransformedValue - minTransformedValue)) * graphHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    ctx.font = '20px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(`Min Value: ${minValue.toFixed(2)}`, margin, height - margin - 30);
    ctx.fillText(`Max Value: ${maxValue.toFixed(2)}`, width - margin - 200, height - margin - 30);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#000000';
    for (let i = 0; i < rewardsHistory.length; i += (rewardsHistory.length / 25)) {
        const start = Math.max(0, i - windowSize + 1);
        const window = rewardsHistory.slice(start, i + 1);
        const avgReward = window.reduce((acc, r) => acc + r, 0) / window.length;
        //const avgReward = [...window].sort((a, b) => a - b)[(Math.round(window.length / 2))];

        const x = margin + (i / (rewardsHistory.length - 1)) * graphWidth;
        let reward = parseInt(avgReward);

        //if(i >= (currentEpisode - windowSize)){
        //    reward = 0;
        //}

        ctx.fillText(reward, x, height - margin - 80);
    }

    const legendY = height - margin - 50;
    ctx.font = '30px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText('Legend:', margin, legendY);

    ctx.fillStyle = 'rgba(192, 75, 192, 1)';
    ctx.fillRect(margin + 150, legendY - 20, 30, 30);
    ctx.fillStyle = '#000000';
    ctx.fillText(`Sliding Window Average (${doLog ? 'Log' : 'Linear'} Scale)`, margin + 190, legendY + 10);

    const out = fs.createWriteStream(fileName);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
}

module.exports = drawCanvas;