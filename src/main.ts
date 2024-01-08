import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue'
import HelloWorld from './components/HelloWorld.vue';
import MapView from './components/MapView.vue';

const routes = [
    { path: '/queue-sim', component: HelloWorld},
    { path: '/map', component: MapView},
  ]

const router = createRouter({
    // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
    history: createWebHashHistory(),
    routes, // short for `routes: routes`
  })

createApp(App).use(router).mount('#app')
