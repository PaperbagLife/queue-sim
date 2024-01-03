<script setup lang="ts">
import { onMounted, computed, reactive, ref, watch, toRefs } from "vue";
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
</script>

<template>
  <form id="testForm">
    <input type="file" id="UploadFile" accept=".csv" />
    <br />
    <input type="submit" value="submit" />
  </form>
  <select v-model="filterCloud">
    <option v-for="cloud in clouds" :key="cloud">{{ cloud }}</option>
  </select>
  <select v-model="filterInstanceType">
    <option v-for="instanceType in instanceTypes" :key="instanceType">
      {{ instanceType }}
    </option>
  </select>

  <svg width="800" height="600" class="system-svg">
    <g
      v-for="runNodeGroup in layouts"
      :key="runNodeGroup.runInfo.id"
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
</template>

<style>
.system-svg {
  background-color: rgb(0, 0, 28);
}

circle {
  stroke: white;
  stroke-width: 0.2px;
}
</style>
