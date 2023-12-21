<script setup lang="ts">
import { reactive, ref, watch } from "vue";
class BufferQueue {
  name: string;
  size = 0;
  drainSize: number;
  drainSpeed: number;
  drainThreshold: number;
  next: BufferQueue | null;
  income?: number;
  drainCounter = 0;
  stopReceiveThreshold: number;
  constructor(
    name: string,
    drainSize: number,
    drainSpeed: number,
    drainThreshold: number,
    next: BufferQueue | null,
    stopReceiveThreshold = 0,
    income = 0
  ) {
    this.name = name;
    this.drainSize = drainSize;
    this.drainSpeed = drainSpeed;
    this.drainThreshold = drainThreshold;
    this.next = next;
    this.income = income;
    this.stopReceiveThreshold = stopReceiveThreshold;
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
      if (this.next == null) {
        this.size -= this.drainSpeed;
        return;
      }
      if (this.next.canReceive()) {
        this.size -= this.drainSpeed;
        this.next?.receive(this.drainSpeed);
        this.drainCounter = this.drainSize / this.drainSpeed - 1;
      } else {
        if (this.next.name === "rx_queue") {
          // Special case, drop this packet
          this.size -= PACKET_SIZE;
        }
      }
    }
  }

  canReceive() {
    return (
      this.stopReceiveThreshold === 0 || this.size < this.stopReceiveThreshold
    );
  }
  receive(size: number) {
    this.size += size;
  }
}

const JUMBO_CHUNK_SIZE = 4;
const PACKET_SIZE = 24;

// Rules: bq1 receives 1 frame per second;
// 1 sends 1 jumbo frame every 16 seconds
// 2 receives 1 jumbo frame and only sends when size >= 2 jumbo frame = 1packet
// 3 receives 1 jumbo frame, sends in frames once a full packet is received.

// 1 receives 1 frame per tick
// 1: drainSize =drainSpeed = drainThreshold= JUMBO_FRAME_SIZE,

const txQueue = reactive(new BufferQueue("tx_queue", 1, 1, 1, null));
const nfAxis = reactive(
  new BufferQueue(
    "nf_axis_converter_main",
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    txQueue
  )
);
const axisFifo = reactive(
  new BufferQueue(
    "axis_fifo",
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    nfAxis,
    60
  )
);

const nicOutputLookup = reactive(
  new BufferQueue(
    "nic_output_port_lookup",
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    axisFifo,
    12
  )
);

const nicOutputQueue = reactive(
  new BufferQueue(
    "nic_output_queues",
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    JUMBO_CHUNK_SIZE,
    nicOutputLookup,
    312
  )
);

const inputArbiter = reactive(
  new BufferQueue("input_arbiter", 4, 4, 4, nicOutputQueue, 252)
);

const nfAxisFirst = reactive(
  new BufferQueue("nf_axis_converter_main(0)", 4, 4, 4, inputArbiter, 63)
);

const axisFifoFirst = reactive(
  new BufferQueue("axis_fifo(0)", 1, 1, 1, nfAxisFirst, 63)
);

const rxQueue = reactive(
  new BufferQueue("rx_queue", 1, 1, 1, axisFifoFirst, 331)
);

const inputQueue = reactive(
  new BufferQueue("axi_10g_ethernet_shared", 1, 1, 1, rxQueue, 0, 1)
);

const bqs = ref([
  inputQueue,
  rxQueue,
  axisFifoFirst,
  nfAxisFirst,
  inputArbiter,
  nicOutputQueue,
  nicOutputLookup,
  axisFifo,
  nfAxis,
  txQueue,
]);

function simulate() {
  bqs.value.forEach((bq) => {
    bq.update();
  });
}

const simSpeed = ref(100);
const simStarted = ref(false);
let simInterval: number;

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
.background {
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
  background-color: white;
}
</style>
