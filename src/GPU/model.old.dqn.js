function makeDenseLayer(x, units, activation = "prelu") {
    const dense = tf.layers.dense({ units, useBias: false, kernelInitializer: 'heNormal' }).apply(x);
    const batchNorm = tf.layers.batchNormalization().apply(dense);

    if (activation == "prelu") {
        const activated = tf.layers.prelu().apply(batchNorm);

        return activated;
    } else {
        const activated = tf.layers.activation({ activation: activation }).apply(batchNorm);

        return activated;
    }
}

class DQN {
    model;
    targetModel;
    modelOptimizer;

    outputs;

    batchSize;
    gamma;

    epsilon;
    minEpsilon;
    epsilonDecay;

    memory = new Memory();

    makeSingleModel(inputs, outputs) {
        let optimizer = tf.train.adam(5e-5);
        this.outputs = outputs;

        let model = tf.sequential();

        model.add(tf.layers.dense({ units: 64, inputShape: [inputs], activation: "relu", useBias: false }));
        model.add(tf.layers.batchNormalization({ momentum: 0.9 }));
        model.add(tf.layers.dense({ units: 128, activation: "relu", useBias: false }));
        model.add(tf.layers.batchNormalization({ momentum: 0.9 }));
        model.add(tf.layers.dense({ units: 32, activation: "relu", useBias: false }));
        model.add(tf.layers.batchNormalization({ momentum: 0.9 }));

        //model.add(tf.layers.dense({ units: 64, inputShape: [inputs], activation: "relu" }));
        //model.add(tf.layers.dense({ units: 128, activation: "relu" }));
        //model.add(tf.layers.dense({ units: 32, activation: "relu" }));

        /*model.add(tf.layers.separableConv2d({ filters: 16, kernelSize: 3, strides: 1, activation: 'relu', inputShape: inputs }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 1 }))
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.separableConv2d({ filters: 32, kernelSize: 3, strides: 1, activation: 'relu' }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 1 }))
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.separableConv2d({ filters: 64, kernelSize: 3, strides: 1, activation: 'relu' }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 1 }))
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({units: 128, activation: 'relu'}));
        model.add(tf.layers.dropout({rate: 0.25}));;*/

        model.add(tf.layers.dense({ units: outputs, activation: "linear" }))
        model.compile({
            loss: 'meanSquaredError',
            optimizer
        });

        return { model, optimizer };
    }

    constructor(inputs, outputs) {
        let model = this.makeSingleModel(inputs, outputs);
        this.model = model.model;
        this.modelOptimizer = model.optimizer;

        this.targetModel = this.makeSingleModel(inputs, outputs).model;
    }

    selectAction(state, ignoreEpsilon) {
        if (!ignoreEpsilon && (Math.random() < this.epsilon)) {
        //if (!ignoreEpsilon && (Math.random() < this.epsilon) && !forceExploit) {
            return Math.floor(Math.random() * this.outputs);
        } else {
            let action = tf.tidy(() => {
                const qValues = this.model.predict(tf.tensor1d(state).expandDims(0)).dataSync();

                let biggest = -Infinity;
                let biggestIndex = 0;
                for (let i = 0; i < qValues.length; i++) {
                    if (isNaN(qValues[i])) {
                        console.warn("GRADIENT EXPLODED");
                    }

                    if (qValues[i] > biggest) {
                        biggest = qValues[i];
                        biggestIndex = i;
                    }
                }

                return biggestIndex;
            })

            return action;
        }
    }

    async train() {
        const batch = this.memory.sample(this.batchSize);
        if (batch.length !== this.batchSize) return;

        const grads = tf.variableGrads(() => this.calculateBatchLoss(batch));
        //grads.value.print();
        this.modelOptimizer.applyGradients(grads.grads);
        tf.dispose(grads);
    }

    calculateBatchLoss(batch) {
        return tf.tidy(() => {
            const stateTensor = tf.stack(batch.map(exp => tf.tensor1d(exp.state)));
            const actionTensor = tf.tensor1d(batch.map(exp => exp.action), 'int32');
            const qs = this.model.apply(stateTensor, { training: true }).mul(tf.oneHot(actionTensor, this.outputs)).sum(-1);

            const nextStateTensor = tf.stack(batch.map(exp => tf.tensor1d(exp.nextState)));
            const nextMaxQTensor = this.targetModel.predict(nextStateTensor).max(-1);
            const rewardTensor = tf.tensor1d(batch.map(exp => exp.reward));
            const doneMask = tf.scalar(1).sub(tf.tensor1d(batch.map(exp => exp.done)).asType('float32'));
            const targetQs = rewardTensor.add(nextMaxQTensor.mul(doneMask).mul(this.gamma));

            return tf.losses.meanSquaredError(targetQs, qs); // huberLoss
        })
    }

    updateTargetModel() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    updateEpsilon() {
        /*switch (this.epsilonDecayType) {
            case "time":
                let timeTillEnd = ((this.epsilonDecayStart + this.epsilonDecayTime) - Date.now()) / this.epsilonDecayTime;

                this.epsilon = this.minEpsilon + (timeTillEnd * (1 - this.minEpsilon));
                break;
            case "episodes":
                this.epsilon *= this.epsilonDecay;
                break;
        }

        if (this.epsilon < this.minEpsilon) {
            this.epsilon = this.minEpsilon;
        }*/


        this.epsilon *= this.epsilonDecay;

        if (this.epsilon < this.minEpsilon) {
            this.epsilon = this.minEpsilon;
        }
    }
}

window.DQN = DQN;