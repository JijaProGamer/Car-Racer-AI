let modelHyperparameters;

let model;
const socket = new WebSocket(`ws://localhost:${parseInt(location.port) + 1}`);

socket.addEventListener("open", (event) => {

});

socket.addEventListener("message", async (event) => {
    if (!model){
        await tf.setBackend("webgl");

        modelHyperparameters = await (await fetch("/hyperparameters.json")).json();
    
        model = new DDPG(modelHyperparameters.inputs, modelHyperparameters.outputs);

        //await model.loadModel()
        model.epsilon = parseFloat(await (await fetch("/epsilon")).text());

        model.batchSize = modelHyperparameters.batchSize;
        model.gamma = modelHyperparameters.gamma;

        model.actorLR = modelHyperparameters.actorLR;
        model.criticLR = modelHyperparameters.criticLR;

        model.tau = modelHyperparameters.tau;
    
        model.epsilon = modelHyperparameters.epsilon;
        model.epsilonDecay = modelHyperparameters.epsilonDecay;
        model.minEpsilon = modelHyperparameters.minEpsilon;

        model.init();
        model.memory.init(modelHyperparameters.memorySize, modelHyperparameters.minimumMemory);
    }

    let data = JSON.parse(event.data);

    switch (data.type) {
        case "save":
            await model.saveModel();
            socket.send(JSON.stringify({ id: data.id }));
            break;
        case "remember":
            model.memory.add(data.data);
            break;
        case "train":
            await model.train();
            socket.send(JSON.stringify({ id: data.id }));
            break;
        case "updateTargetModel":
            model.updateTargetModel();
            break;
        case "updateEpsilon":
            model.updateEpsilon();
            break;
        case "act":
            let result = await model.calculateActions(data.state, false);
            socket.send(JSON.stringify({ id: data.id, predictions: result }));

            break;
    }
});