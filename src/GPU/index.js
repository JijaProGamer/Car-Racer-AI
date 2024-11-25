let modelHyperparameters;

let model;
const socket = new WebSocket(`ws://localhost:${parseInt(location.port) + 1}`);

socket.addEventListener("open", (event) => {

});

socket.addEventListener("message", async (event) => {
    if (!model){
        await tf.setBackend("webgl");

        modelHyperparameters = await (await fetch("/hyperparameters.json")).json();
    
        model = new TD3();
        //model = new SAC();

        //await model.loadModel()
        model.epsilon = parseFloat(await (await fetch("/epsilon")).text());

        model.batchSize = modelHyperparameters.batchSize;
        model.gamma = modelHyperparameters.gamma;

        model.actorLR = modelHyperparameters.actorLR;
        model.criticLR = modelHyperparameters.criticLR;
        //model.alphaLR = modelHyperparameters.alphaLR;

        model.tau = modelHyperparameters.tau;
    
        model.epsilon = modelHyperparameters.epsilon;
        model.epsilonDecay = modelHyperparameters.epsilonDecay;
        model.minEpsilon = modelHyperparameters.minEpsilon;

        model.policyDelay = modelHyperparameters.policyDelay;
        model.actionNoise = modelHyperparameters.actionNoise;
        model.noiseClip = modelHyperparameters.noiseClip;

        model.inputs = modelHyperparameters.inputs;
        model.outputs = modelHyperparameters.outputs;

        model.init();
        //model.memory.init(modelHyperparameters.memorySize, modelHyperparameters.minimumMemory);
    }

    let data = JSON.parse(event.data);

    switch (data.type) {
        case "save":
            await model.saveModel();
            socket.send(JSON.stringify({ id: data.id }));
            break;
        //case "remember":
        //    //model.memory.add(data.data);
        //    break;
        case "train":
            let trainResults = await model.train(data.batch);
            socket.send(JSON.stringify({ id: data.id, trainResults }));
            break;
        case "updateTargetModel":
            model.updateTargetModel();
            break;
        case "updateEpsilon":
            model.updateEpsilon();
            break;
        case "act":
            let result = await model.calculateActions(data.state, data.ignoreEpsilon);
            socket.send(JSON.stringify({ id: data.id, predictions: result }));

            break;
    }
});