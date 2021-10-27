<template>
  <div class="search">
    <div class="search-icon"></div>
    <input class="search-input" />
    <div class="search-icon"></div>
  </div>
</template>

<script setup lang="ts"></script>
<style scoped>
.search {
  margin-top: 8px;
  margin-left: 8px;
  margin-right: 8px;
  height: 26px;
  border-radius: 4px;
  background-color: #cbccd9;
  display: flex;
  padding: 0 8px;
}

.search-icon {
  width: 8px;
  height: 8px;
  background-color: red;
  align-self: center;
}

.search-input {
  width: 0;
  flex: 1;
  background: none;
  outline: none;
  border: none;
}
</style>
