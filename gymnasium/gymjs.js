const ws = require("ws");

const wss = new ws.WebSocketServer({ port: 5555 });

function calculateAction(state){
    return [Math.random() * 2 - 1];
}

function addMemory(data){
    return [Math.random() * 2 - 1];
}


wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(observation) {
    observation = JSON.parse(observation.toString());

    switch(observation[0]){
        case "action":
            let state = observation[1];

            ws.send(JSON.stringify(calculateAction(state)));
            break;
        case "reward":
            let rawActionData = observation[1];
            let actionData = {
                reward: rawActionData[0], 
                done: rawActionData[1] == 1, 
                state: rawActionData[2],
                next_state: rawActionData[3]
            }

            addMemory(actionData);

            ws.send(1);
            break;
    }
  });
});