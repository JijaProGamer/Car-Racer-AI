import "./General.js";
import "./EnvironmentFunctions.js";
import "./UIFunctions.js";
import "./UI.js";
import "./Environment.js";

import "./DQN.js";
window.brains = new DQN()

const maxSteps = 10000;

brains.makeModel(26, actions.length);
brains.memory.init(maxSteps * 100);


let raycasts;

async function step() {  
  if (/*brains.epsilon > 0.9 &&*/ stepsTotal % 500 == 0 && isFast) {
    await sleep(1);
  }

  if (steps == 0) {
    //let carSpawnpoint = findSpawnPoint(24);
    //track.carStart = carSpawnpoint;
  }

  raycasts = doRaycasts(24);
  let state = calculateEnvironment(raycasts);

  let action = brains.selectAction(state, !isExploring);

  if (carIntersectsSegments()) {
    return await resetEnvironment(state, action, true);
  } else if (steps >= maxSteps) {
    return await resetEnvironment(state, action, false);
  }

  let reward = calculateRewards(raycasts);
  episodeReward += reward;

  if (reward !== 0 && lastState) {
    brains.memory.add({ state: lastState, nextState: state, reward, done: false, action });
  }

  lastState = state;
  steps++;
  stepsTotal++;

  let direction = actionToDirection(action);
  updateCar(manualDrive ? manualDirection : direction);
}

async function buildStep() {
  await sleep(16.667);
  updateCar(manualDirection);
}

let lastDrawn = performance.now();

;((async () => {
  while(true){
    if(!isFast) await sleep(16.667);
  
    if(track.startFinish.x1 == 0){
      await buildStep();
    } else {
      await step();
    }
  
    if((performance.now() - lastDrawn) > 16.667){
      draw(raycasts || []);
    
      drawStatistics()
      lastDrawn = performance.now();
    }
  }
})());