<template>
  <div
    class="layer-item"
    :class="{
      selected: layer.isSelected,
      subselected: layer.subSelected,
      invisible: !layer.isVisible,
      subinvisible: layer.subInVisible,
      locked: layer.isLocked,
      hovered: hovered,
    }"
  >
    <div :style="spacingStyle"></div>
    <img
      v-if="isGroup"
      class="collapse-icon"
      :class="isGroupClosed && 'close'"
      src="~@/assets/imgs/img.chevron.down.11_Normal@2x.png"
      @click.stop="emit('toggle', layer as SkyBaseGroup)"
    />
    <div v-else class="collapse-icon"></div>
    <LayerIcon :layer="layer" />
    <p class="text-overflow flex-h-auto">{{ layer.name }}</p>
    <div class="op-icons">
      <span class="op-icon lock" @click.stop="emit('toggleLock', layer)">
        <LockLockIcon v-if="layer.isLocked"></LockLockIcon>
        <LockOpenIcon v-else />
      </span>
      <span class="op-icon eye" @click.stop="emit('toggleVisible', layer)">
        <EyeOpenIcon v-if="layer.isVisible"></EyeOpenIcon>
        <EyeClosedIcon v-else />
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { SkyBaseGroup, SkyBaseLayer } from '~/lib/editor/model';
import LayerIcon from './layer-icon.vue';
import EyeClosedIcon from '~/assets/svg-comp/eye-closed.svg';
import EyeOpenIcon from '~/assets/svg-comp/eye-open.svg';
import LockLockIcon from '~/assets/svg-comp/lock-lock.svg';
import LockOpenIcon from '~/assets/svg-comp/lock-open.svg';

const props = defineProps<{
  selected: boolean;
  hovered: boolean;
  layer: SkyBaseLayer;
}>();

const emit = defineEmits<{
  (event: 'toggle', layer: SkyBaseGroup): void;
  (event: 'toggleLock', layer: SkyBaseLayer): void;
  (event: 'toggleVisible', layer: SkyBaseLayer): void;
}>();

// 都必须从 props 上获取，因为 layer 可能传入新的
const isGroup = computed(() => props.layer instanceof SkyBaseGroup);
const isGroupClosed = computed(() => props.layer instanceof SkyBaseGroup && !props.layer.isOutlineExpanded);

const spacingStyle = computed(() => ({
  width: props.layer.depth * 8 + 'px',
}));
</script>
<style scoped>
.layer-item {
  height: 26px;
  font-size: 12px;
  margin: 0 8px;
  display: flex;
  align-items: center;
  cursor: default;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
}

.layer-item.selected {
  background-color: #a5a5a5;
}
.layer-item.subselected {
  background-color: #a5a5a556;
  border-radius: 0px;
}
.layer-item.invisible,
.layer-item.subinvisible {
  opacity: 0.5;
}

.layer-item.hovered:not(.selected),
.layer-item:hover:not(.selected) {
  border: 1px dashed black;
}

.layer-item:hover .op-icon {
  visibility: visible;
}

.layer-item.locked .op-icon.lock {
  visibility: visible;
}

.collapse-icon {
  width: 11px;
  height: 11px;
  margin-right: 4px;
}
.collapse-icon.close {
  transform: rotate(-90deg);
}

.op-icons {
  display: none;
}
.layer-item:hover .op-icons {
  display: flex;
}

.layer-item.locked .op-icons {
  display: flex;
}

.op-icon {
  display: inline-flex;
  width: 18px;
  align-items: center;
  justify-content: center;
  visibility: hidden;
}
</style>
