function uint8ToImage(uint8Array) {
    let tensor = tf.tensor(uint8Array, [uint8Array.length, uint8Array[0].length, 3], 'float32'); 
    const normalizedTensor = tensor.div(tf.scalar(255));
  
    return normalizedTensor;
}

function makeConvLayer(input, filters, kernelSize){
    let conv        = tf.layers.separableConv2d({ filters, kernelSize, padding: 'same', useBias: false }).apply(input);
    let prelu       = tf.layers.prelu({ alphaInitializer: 'glorotNormal', useBias: false }).apply(conv); 
    let pool        = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(prelu);
    let batchNorm   = tf.layers.batchNormalization().apply(pool); 
    
    return batchNorm;
}

function makeDenseLayer(input, units){
    let dense       = tf.layers.dense({ units, useBias: false }).apply(input);
    let prelu       = tf.layers.prelu({ alphaInitializer: 'glorotNormal' }).apply(dense); 
    let batchNorm   = tf.layers.batchNormalization().apply(prelu); 
    
    return batchNorm;
}

class OUActionNoise {
    constructor(mean, stdDeviation, theta = 0.15, dt = 1e-2) {
        this.theta = theta;
        this.mean = tf.tensor1d(mean);
        this.stdDev = stdDeviation;
        this.dt = dt;

        this.reset();
    }

    call() {
        const x = tf.tensor1d(this.xPrev)
            .add(this.mean.sub(tf.tensor1d(this.xPrev).mul(this.theta).mul(this.dt)))
            .add(tf.scalar(this.stdDev).mul(tf.scalar(this.dt).sqrt()).mul(tf.randomNormal(this.mean.shape)));

        this.xPrev = x.dataSync();
        return x;
    }

    reset() {
        //this.xPrev = new Array(this.mean.shape[0]).fill(0);
        this.xPrev = Array.from({ length: this.mean.shape[0] }, () => (Math.random() * 2 - 1) * this.stdDev);
    }
}

class DDPG {
    actorModel;
    actorModelOptimizer;

    criticModel;
    criticModelOptimizer;


    targetActorModel;
    targetActorModelOptimizer;

    targetCriticModel;
    targetCriticModelOptimizer;




    //memory = new Memory();
    noise;

    outputs;
    inputs;

    gamma;
    tau;
    batchSize;

    actorLR;
    criticLR;

    epsilon;
    minEpsilon;
    
    init(){
        //this.noise = new OUActionNoise(Array(this.outputs).fill(0), 0.2, 0.15, 1e-2);
        this.noise = new OUActionNoise(Array(this.outputs).fill(0), this.epsilon, 0.15, 1e-2);

        this.actorModel = this.createActorModel();
        this.criticModel = this.createCriticModel();
        this.targetActorModel = this.createActorModel();
        this.targetCriticModel = this.createCriticModel();

        this.targetActorModel.setWeights(this.actorModel.getWeights());
        this.targetCriticModel.setWeights(this.criticModel.getWeights());

        this.actorModelOptimizer = tf.train.adam(this.actorLR);
        this.criticModelOptimizer = tf.train.adam(this.criticLR);
    }

    createActorModel() {
        const input = tf.input({ shape: this.inputs });

        let output = makeConvLayer(input, 32, 5);
        output = makeConvLayer(output, 64, 3);
        output = tf.layers.flatten().apply(output);
        output = makeDenseLayer(output, 64);
        output = makeDenseLayer(output, 32);

        output = tf.layers.dense({ units: this.outputs[0], activation: 'tanh', 
            kernelInitializer: tf.initializers.randomUniform( { minval: -0.003, maxval: 0.003 }) 
        }).apply(output);

        const model = tf.model({ inputs: input, outputs: output });
        return model;
    }

    createCriticModel() {
        const stateInput = tf.input({ shape: this.inputs });

        let stateOut = makeConvLayer(stateInput, 32, 5);
        stateOut = makeConvLayer(stateOut, 64, 3);
        stateOut = tf.layers.flatten().apply(stateOut);
        stateOut = makeDenseLayer(stateOut, 64);
        stateOut = makeDenseLayer(stateOut, 32);

        const actionInput = tf.input({ shape: this.outputs });
        let actionOut = makeDenseLayer(actionInput, 64);

        const concat = tf.layers.concatenate().apply([stateOut, actionOut]);

        let out = makeDenseLayer(concat, 256);
        out = makeDenseLayer(out, 256);


        const outputs = tf.layers.dense({ units: 1 }).apply(out);

        const model = tf.model({ inputs: [stateInput, actionInput], outputs: outputs });

        return model;
    }

    calculateActions(state, ignoreEpsilon) {
        return tf.tidy(() => {
            state = uint8ToImage(state).expandDims(0);
            //state = tf.tensor1d(state).expandDims(0);

            const actions = this.actorModel.predict(state).squeeze();

            if (ignoreEpsilon) {
                return actions.dataSync();
            } else {
                const noise = this.noise.call();
                const noisyActions = actions.add(noise).clipByValue(-1, 1);

                return noisyActions.dataSync();
            }
        });
    }

    async train(batch) {
        //const batch = this.memory.sample(this.batchSize);
        //if (batch.length !== this.batchSize) return;

        return tf.tidy(() => {
            const stateBatch = tf.stack(batch.map(exp => uint8ToImage(exp.state)));
            //const stateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));
            const nextStateBatch = tf.stack(batch.map(exp => uint8ToImage(exp.nextState)));
            //const nextStateBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));
            const actionBatch = tf.stack(batch.map(exp => tf.tensor1d(exp.action)));
            const rewardBatch = tf.tensor1d(batch.map(exp => exp.reward));
            const doneMask = tf.scalar(1).sub(tf.tensor1d(batch.map(exp => exp.done)).asType('float32'));




            let { grads: critic_gradients, value: critic_loss } = tf.variableGrads(() => {
                const targetActions = this.targetActorModel.predict(nextStateBatch);
                const targetQ = this.targetCriticModel.predict([nextStateBatch, targetActions]).squeeze();

                const y = rewardBatch.add(targetQ.mul(this.gamma).mul(doneMask));

                const criticQs = this.criticModel.predict([stateBatch, actionBatch]).squeeze();
                const criticLoss = tf.losses.meanSquaredError(y, criticQs);

                return criticLoss;
            }, this.criticModel.getWeights())



            /*for (const key in critic_gradients) {
                if(!critic_gradients[key]) continue;
                
                critic_gradients[key] = critic_gradients[key].clipByValue(-1, 1);
            }*/

            this.criticModelOptimizer.applyGradients(critic_gradients);







            let { grads: actor_gradients, value: actor_loss } = tf.variableGrads(() => {
                const predictedActions = this.actorModel.predict(stateBatch).squeeze();
                const criticValue = this.criticModel.predict([stateBatch, predictedActions]).squeeze();
                const actor_loss = criticValue.mean().neg();

                return actor_loss;
            }, this.actorModel.getWeights())


            /*for (const key in actor_gradients) {
                if(!actor_gradients[key]) continue;

                actor_gradients[key] = actor_gradients[key].clipByValue(-1, 1);
            }*/

            this.actorModelOptimizer.applyGradients(actor_gradients);







            return { critic_loss: critic_loss.dataSync(), actor_loss: actor_loss.dataSync() }
        });
    }

    async saveModel(){
        await this.actorModel.save(`http://localhost:${location.port}/actor`);
        await this.criticModel.save(`http://localhost:${location.port}/critic`);
        await this.targetActorModel.save(`http://localhost:${location.port}/targetActor`);
        await this.targetCriticModel.save(`http://localhost:${location.port}/targetCritic`);
    }

    updateTargetModel() {
        tf.tidy(() => {
            const modelPairs = [
                [this.targetActorModel, this.actorModel],
                [this.targetCriticModel, this.criticModel]
            ];
    
            modelPairs.forEach(([targetModel, model]) => {
                const targetWeights = targetModel.getWeights();
                const modelWeights = model.getWeights();

                for(let i = 0; i < targetWeights.length; i++){
                    targetWeights[i] = targetWeights[i].mul(1 - this.tau).add(modelWeights[i].mul(this.tau));
                }

                targetModel.setWeights(targetWeights);
            });
        })
    }

    updateEpsilon() {
        switch (this.epsilonDecayType) {
            case "time":
                let timeTillEnd = ((this.epsilonDecayStart + this.epsilonDecayTime) - Date.now()) / this.epsilonDecayTime;

                this.epsilon = this.minEpsilon + (timeTillEnd * (1 - this.minEpsilon));
                break;
            case "episodes":
                this.epsilon -= this.epsilonDecay;
                break;
        }

        if (this.epsilon < this.minEpsilon) {
            this.epsilon = this.minEpsilon;
        }

        this.noise.stdDev = this.epsilon;
    }
}


window.DDPG = DDPG;