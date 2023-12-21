<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
class BufferQueue {
  name: string;
  size = 0;
  drainSize: number;
  drainSpeed: number;
  drainThreshold: number;
  next: BufferQueue | null;
  income?: number;
  drainCounter = 0;
  constructor(
    name: string,
    drainSize: number,
    drainSpeed: number,
    drainThreshold: number,
    next: BufferQueue | null,
    income?: number
  ) {
    this.name = name;
    this.drainSize = drainSize;
    this.drainSpeed = drainSpeed;
    this.drainThreshold = drainThreshold;
    this.next = next;
    this.income = income;
  }

  update() {
    this.size += this.income ?? 0;
    if (this.drainCounter > 0) {
      this.drainCounter -= 1;
      this.size -= this.drainSpeed;
      this.next?.receive(this.drainSpeed);
      return;
    }
    if (this.size >= this.drainThreshold) {
      this.size -= this.drainSpeed;
      this.next?.receive(this.drainSpeed);
      this.drainCounter = this.drainSize / this.drainSpeed - 1;
    }
  }
  receive(size: number) {
    this.size += size;
  }
}

const JUMBO_FRAME_SIZE = 16;
const PACKET_SIZE = 32;

// Rules: bq1 receives 1 frame per second;
// 1 sends 1 jumbo frame every 16 seconds
// 2 receives 1 jumbo frame and only sends when size >= 2 jumbo frame = 1packet
// 3 receives 1 jumbo frame, sends in frames once a full packet is received.

// 1 receives 1 frame per tick
// 1: drainSize =drainSpeed = drainThreshold= JUMBO_FRAME_SIZE,

const bq3 = reactive(new BufferQueue('bq3', PACKET_SIZE, 1, PACKET_SIZE, null));
const bq2 = reactive(
  new BufferQueue('bq2', PACKET_SIZE, JUMBO_FRAME_SIZE, PACKET_SIZE, bq3)
);
const bq1 = reactive(
  new BufferQueue(
    'bq1',
    JUMBO_FRAME_SIZE,
    JUMBO_FRAME_SIZE,
    JUMBO_FRAME_SIZE,
    bq2,
    1
  )
);

const bqs = ref([bq1, bq2, bq3]);

const numBqs = ref(3);

watch(numBqs, () => {
  if (numBqs.value > bqs.value.length) {
    for (let i = 0; i < numBqs.value - bqs.value.length; i += 1) {
      const newBq = reactive(
        new BufferQueue(`bq ${bqs.value.length + 1}`, 1, 1, 1, null)
      );
      bqs.value[bqs.value.length - 1].next = newBq;
      bqs.value.push(newBq);
    }
  } else if (numBqs.value < bqs.value.length) {
    bqs.value.length = numBqs.value;
  }
});

function simulate() {
  bqs.value.forEach((bq) => {
    bq.update();
  });
}

const simSpeed = ref(100);
const simStarted = ref(false);
let simInterval;

function startSim() {
  simStarted.value = true;
  simInterval = setInterval(simulate, simSpeed.value);
}

function endSim() {
  simStarted.value = false;
  clearInterval(simInterval);
}
</script>

<template>
  <div class="col background">
    <button v-if="!simStarted" @click="startSim">Start sim</button>
    <button v-else @click="endSim">End sim</button>
    <div>Sim Interval | lower number the faster</div>
    <input v-model="simSpeed" type="number" />
    <div class="my-2 row d-flex justify-content-center">
      <button @click="numBqs += 1">add BQ</button>
      <button @click="numBqs = Math.max(1, numBqs - 1)">remove BQ</button>
    </div>
    <div class="d-flex row justify-content-center">
      <div v-for="bq in bqs" :key="bq.name" class="col-auto">
        <div>drainSize</div>
        <input v-model="bq.drainSize" type="number" />
        <div>drainSpeed</div>
        <input v-model="bq.drainSpeed" type="number" />
        <div>drainThreshold</div>
        <input v-model="bq.drainThreshold" type="number" />
      </div>
    </div>
    <div class="d-flex row justify-content-center">
      <div v-for="bq in bqs" :key="bq.name" class="col-auto">
        <div>{{ bq.name }}</div>
        <div>{{ bq.size }}</div>
        <div v-for="i in new Array(bq.size)" :key="i" class="frame" />
      </div>
    </div>
  </div>
</template>


<style>
.background  {
  padding-top: 30px;
}
button {
  border: 1px solid grey;
  border-radius: 4px !important;
}

input {
  background: #c4c4c4;
  border: 1px solid grey;
  border-radius: 4px !important;
}

.frame {
  height: 2px;
  background-color: white
}
</style>