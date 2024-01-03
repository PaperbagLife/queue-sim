<script setup lang="ts">
import { onMounted, computed, reactive, ref, watch } from "vue";
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
};
const data = ref<RunInfo[]>([]);

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
        };
        data.value.push(runInfo);
      });
    };
    reader.readAsText(input);
  });
});

type RunNode = {
  offsetX: number;
  offsetY: number;
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

const layouts = computed<RunNodeGroup[]>(() => {
  const nodes = data.value.map((runInfo) => {
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
        fill="red"
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
