const ws = require("ws");

const wss = new ws.WebSocketServer({ port: 5555 });

module.exports = function(calculateAction, onDone, addMemory, makeBrains){
    wss.on('connection', function connection(ws) {
      ws.on('error', console.error);
    
      ws.on('message', async function message(observation) {
        observation = JSON.parse(observation.toString());
    
        switch(observation[0]){
            case "environment":
                let environment = observation[1];

                await makeBrains(environment[0], environment[1]);

                ws.send(1);
                break;
            case "action":
                let state = observation[1];
    
                ws.send(JSON.stringify(await calculateAction(state)));
                break;
            case "reward":
                let rawActionData = observation[1];

                let actionData = {
                    reward: rawActionData[0], 
                    done: rawActionData[1], 
                    action: rawActionData[2], 
                    state: rawActionData[3],
                    nextState: rawActionData[4]
                }
    
                addMemory(actionData);
                break;
            case "done":
                let stop = await onDone();

                ws.send(stop ? 1 : 0);
                break;
        }
      });
    });
}