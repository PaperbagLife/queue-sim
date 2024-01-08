<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import * as d3 from "d3";

type RunInfo = {
  id: string;
  nodeSizes: number[];
  cloud: string;
  instanceType: string;
  bandwidth: number;
  createTime: number;
  weekday: number;
  longitude: number;
  latitude: number;
  scaled: number;
};
const data = ref<RunInfo[]>([]);
const filterInstanceType = ref("");
const instanceTypes = ref([""]);
const filterCloud = ref("");
const clouds = ref([""]);

onMounted(() => {
  const testForm = document.getElementById("testForm");
  const csvDataFile = document.getElementById("UploadFile");
  testForm?.addEventListener("submit", function (e) {
    e.preventDefault();

    const input = csvDataFile?.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      data.value = [];
      const text = e.target.result;
      const csvData = d3.csvParse(text);
      csvData.forEach((row: Record<string, string>) => {
        const runInfo = {
          id: row["audit_id"],
          nodeSizes: JSON.parse(row["Top Nodes"]),
          cloud: row["Cloud"],
          instanceType: row["Instance Type"],
          bandwidth: JSON.parse(row["Bottleneck Bandwidth"]),
          createTime: JSON.parse(row["Create Time"]),
          weekday: JSON.parse(row["Weekday"]),
          longitude: JSON.parse(row["Longitude"]) + 180,
          latitude: JSON.parse(row["Latitude"]) + 90,
          scaled: JSON.parse(row["Scaled Throughput"]),
        };
        data.value.push(runInfo);
        if (
          instanceTypes.value.find((v) => v === runInfo.instanceType) ===
          undefined
        ) {
          instanceTypes.value.push(runInfo.instanceType);
        }
        if (clouds.value.find((v) => v === runInfo.cloud) === undefined) {
          clouds.value.push(runInfo.cloud);
        }
      });
    };
    reader.readAsText(input);
  });
});

type RunNode = {
  offsetX: number;
  offsetY: number;
  color: string;
  r: number;
  parent: RunNodeGroup;
};

type RunNodeGroup = {
  x: number;
  y: number;
  runInfo: RunInfo;
  children: RunNode[];
};

const scaleX = 800 / 360;
const scaleY = 600 / 180;

const colorScale = d3.interpolateRgbBasis(["#4287f5", "#f54242"]);

const filteredData = computed(() => {
  const res = data.value.filter((entry) => {
    return (
      (filterCloud.value === "" || entry.cloud === filterCloud.value) &&
      (filterInstanceType.value === "" ||
        entry.instanceType === filterInstanceType.value)
    );
  });
  return res;
});

const layouts = computed<RunNodeGroup[]>(() => {
  const nodes = filteredData.value.map((runInfo) => {
    const runNodeGroup: RunNodeGroup = {
      runInfo,
      children: [],
      x: runInfo.longitude * scaleX,
      y: runInfo.latitude * scaleY,
    };
    const packedLocations = d3.packSiblings(
      runInfo.nodeSizes.map((count) => {
        return { r: Math.sqrt(count) };
      })
    );
    packedLocations.forEach((location: { x: number; y: number; r: number }) => {
      runNodeGroup.children.push({
        offsetX: location.x,
        offsetY: location.y,
        r: location.r,
        color: colorScale(runInfo.scaled),
        parent: runNodeGroup,
      });
    });
    return runNodeGroup;
  });
  return nodes;
});

const popperDiv = ref<HTMLElement | null>(null);
const visible = ref(true);

const hoveredReference = ref<Element | null>(null);
const hoveredEntity = ref<RunInfo | null>(null);

function onConsoleHover(e: MouseEvent) {
  if (!(e.target instanceof Element)) {
    hoveredReference.value = document.body;
    hoveredEntity.value = null;
    return;
  }

  const renderNodeGroup = e.target.closest<SVGGElement>(".run-node-group");
  if (renderNodeGroup) {
    hoveredReference.value = renderNodeGroup;
    const xd = id2RunInfo.value.get(renderNodeGroup?.dataset.group ?? "");
    if (xd) {
      hoveredEntity.value = xd;
    }
  }
}

const id2RunInfo = computed(() => {
  const m = new Map<string, RunInfo>();
  filteredData.value.forEach((entry) => {
    m.set(entry.id, entry);
  });
  return m;
});

watch(
  [() => hoveredEntity, () => hoveredReference],
  ([hoverEntity, reference]) => {
    if (!hoverEntity || !reference) {
      visible.value = false;
      return;
    }
  },
  { immediate: true }
);

const clickInfo = ref<RunInfo | null>(null);
function onConsoleClick(e: MouseEvent) {
  if (!(e.target instanceof Element)) {
    hoveredReference.value = document.body;
    hoveredEntity.value = null;
    return;
  }

  const renderNodeGroup = e.target.closest<SVGGElement>(".run-node-group");
  if (renderNodeGroup) {
    hoveredReference.value = renderNodeGroup;
    const xd = id2RunInfo.value.get(renderNodeGroup?.dataset.group ?? "");
    if (xd) {
      clickInfo.value = xd;
    }
  }
}
</script>

<template>
  <link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
    crossorigin="anonymous"
  />
  <div class="col">
    <div class="row">
      <div class="col-6">
        <div
          v-show="visible"
          ref="popperDiv"
          class="hover-card popper"
          tabindex="-1"
        >
          <div>Currently hovering:</div>
          <div>Bandwidth: {{ hoveredEntity?.bandwidth }}</div>
          <div>ID: {{ hoveredEntity?.id }}</div>
          <div>Cloud: {{ hoveredEntity?.cloud }}</div>
        </div>
      </div>
      <div class="col-6">
        <div>
          <div>Selected:</div>
          <div>Bandwidth:{{ clickInfo?.bandwidth }}</div>
          <a
            :href="`https://sensei.clockwork.io/user/gallery/?audit=${
              clickInfo?.id ?? ''
            }`"
            target="_blank"
          >
            ID:{{ clickInfo?.id }}
          </a>
          <div>Cloud:{{ clickInfo?.cloud }}</div>
        </div>
      </div>
    </div>

    <div class="row">
      <form id="testForm">
        <input type="file" id="UploadFile" accept=".csv" />
        <input type="submit" value="submit" />
      </form>
    </div>

    <div class="row d-flex justify-content-center">
      <div class="w-25 mx-2">
        <span>filter cloud</span>
        <select v-model="filterCloud">
          <option v-for="cloud in clouds" :key="cloud">{{ cloud }}</option>
        </select>
      </div>

      <div class="w-50 mx-2">
        <span>filter instance type</span>
        <select v-model="filterInstanceType">
          <option v-for="instanceType in instanceTypes" :key="instanceType">
            {{ instanceType }}
          </option>
        </select>
      </div>
    </div>

    <div class="row justify-content-center">
      <svg
        class="system-svg"
        @mouseover="onConsoleHover"
        @click="onConsoleClick"
      >
        <image href="../assets/worldMap.png" height="600" width="800" />
        <g
          v-for="runNodeGroup in layouts"
          class="run-node-group"
          :key="runNodeGroup.runInfo.id"
          :data-group="runNodeGroup.runInfo.id"
          :style="{
            transform: `translate(${runNodeGroup.x}px, ${runNodeGroup.y}px)`,
          }"
        >
          <circle
            v-for="child in runNodeGroup.children"
            :key="`${child.offsetX}-${child.offsetY}-${child.r}`"
            :r="child.r"
            :fill="child.color"
            :cy="child.offsetY"
            :cx="child.offsetX"
          ></circle>
        </g>
      </svg>
    </div>
  </div>
</template>

<style>
.system-svg {
  background-color: rgb(241, 241, 241);
  width: 800px !important;
  height: 600px;
}

circle {
  stroke: white;
  stroke-width: 0.2px;
}
</style>
