<template>
  <svg class="layer-icon" v-if="pathIcon" :viewBox="pathIcon.viewBox" xmlns="http://www.w3.org/2000/svg">
    <path :d="pathIcon.path" stroke="#707070" fill="#b8b8b8" :stroke-width="pathIcon.strokeWidth" fill-rule="evenodd" />
  </svg>
  <div v-else class="layer-icon" :style="icon ? { 'background-image': `url(${icon})` } : undefined" />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { ClassValue, SkyBaseGroup, SkyBaseLayer } from '~/lib/editor/model';

import FolderClosed from '~/assets/imgs/img.folder.closed.17_Normal@2x.png';
import FolderOpen from '~/assets/imgs/img.folder.open.17_Normal@2x.png';
import BitmapIcon from '~/assets/imgs/img.image.17_Normal@2x.png';
import ArtBoardIcon from '~/assets/imgs/img.artboard.17_Normal@2x.png';
import SymbolIcon from '~/assets/imgs/img.symbol.17_Normal@2x.png';
import SymbolMasterIcon from '~/assets/imgs/img.misc.create.symbol.24_Normal@2x.png';
import TextIcon from '~/assets/imgs/img.textformat.17_Normal@2x.png';
import { EditorState } from '~/components/editor-state';

const props = defineProps<{ layer: SkyBaseLayer }>();

const pathIcon = computed(() => {
  const info = EditorState.shared.getPathIcon(props.layer);
  if (!info) return undefined;
  const { bounds, path } = info;
  const scale = Math.max(bounds.width / 17, bounds.height / 17);
  const viewBox = `${bounds.x - scale} ${bounds.y - scale} ${bounds.width + 2 * scale} ${bounds.height + 2 * scale}`;

  return {
    strokeWidth: scale,
    viewBox,
    path,
  };
});

const icon = computed(() => {
  const layer = props.layer as SkyBaseGroup['layers'][0];
  switch (layer._class) {
    case ClassValue.Group:
      return layer.isOutlineExpanded ? FolderOpen : FolderClosed;
    case ClassValue.Bitmap:
      return BitmapIcon;
    case ClassValue.Artboard:
      return ArtBoardIcon;
    case ClassValue.SymbolMaster:
      return SymbolMasterIcon;
    case ClassValue.SymbolInstance:
      return SymbolIcon;
    case ClassValue.Text:
      return TextIcon;
  }
  return '';
});
</script>
<style>
.layer-icon {
  width: 17px;
  height: 17px;
  background-size: contain;
  margin-right: 6px;
}
</style>
