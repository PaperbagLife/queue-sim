<template>
  <div class="col">
    <router-link class="col-auto" to="/">QueueSim</router-link>
    <router-link class="col-auto" to="/map">Bandwidth Map</router-link>
  </div>

  <router-view></router-view>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "App",
  components: {},
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
router-link {
  color: white;
}
</style>
