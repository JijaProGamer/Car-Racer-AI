/*class Memory {
    buffer = []
    indices = []
    maxLength = 0
    minLength = 0;
    added = 0
    index = 0

    init(maxLength, minLength) {
        this.maxLength = maxLength;
        this.minLength = minLength;
        this.buffer = new Array(maxLength);
        this.added = 0;
        this.index = 0;
        this.indices = [];
    }

    add(item) {
        this.buffer[this.index] = item;
        this.added = Math.min(this.added + 1, this.maxLength);

        this.index = (this.index + 1) % this.maxLength;
    }

    sample(batchSize) {
        if (this.added < this.minLength) {
            return [];
        }

        this.shuffleIndices();

        const samples = [];

        for (let i = 0; i < batchSize; i++) {
            let sample = this.buffer[this.indices[i]];
            if (sample) {
                samples.push(sample);
            }
        }

        return samples;
    }

    shuffleIndices() {
        this.indices = [...Array(this.added).keys()];
        tf.util.shuffle(this.indices);
    }
}

window.Memory = Memory;*/