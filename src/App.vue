<template>
  <MapView msg="Welcome to Your Vue.js + TypeScript App" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import MapView from "./components/MapView.vue";

export default defineComponent({
  name: "App",
  components: {
    MapView,
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #c8c8c8;
  background: rgb(22, 22, 22);
  min-height: 100vh;
}
</style>
