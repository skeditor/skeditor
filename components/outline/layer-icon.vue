<template>
  <div class="layer-icon" :style="icon ? { 'background-image': `url(${icon})` } : undefined" />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { ClassValue, SkyBaseGroup, SkyBaseLayer } from '~/lib/editor/model';
import FolderClosed from '~/assets/imgs/img.folder.closed.17_Normal@2x.png';
import FolderOpen from '~/assets/imgs/img.folder.open.17_Normal@2x.png';
import BitmapIcon from '~/assets/imgs/img.image.17_Normal@2x.png';
import ArtBoardIcon from '~/assets/imgs/img.artboard.17_Normal@2x.png';
import SymbolIcon from '~/assets/imgs/img.symbol.17_Normal@2x.png';
import TextIcon from '~/assets/imgs/img.textformat.17_Normal@2x.png';

const props = defineProps<{ layer: SkyBaseLayer }>();
const icon = computed(() => {
  const layer = props.layer as SkyBaseGroup['layers'][0];
  switch (layer._class) {
    case ClassValue.Group:
      return layer.isOutlineExpanded ? FolderOpen : FolderClosed;
    case ClassValue.Bitmap:
      return BitmapIcon;
    case ClassValue.Artboard:
    case ClassValue.SymbolMaster:
      return ArtBoardIcon;
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
