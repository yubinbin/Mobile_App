<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="['ProjectView']">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>
