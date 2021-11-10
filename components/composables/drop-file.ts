import { ref, onMounted, onUnmounted } from 'vue';

const fileRef = ref<File>();

export function useDropFile() {
  onMounted(() => {
    document.addEventListener('drop', onDrop);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragenter', onDragEnter);
  });
  onUnmounted(() => {
    document.removeEventListener('drop', onDrop);
    document.removeEventListener('dragover', onDragOver);
    document.removeEventListener('dragenter', onDragEnter);
  });

  return fileRef;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}

function onDragEnter(event: DragEvent) {
  event.preventDefault();
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  const file = Array.from(event.dataTransfer?.files || []).find((file) => {
    return file.name.toLowerCase().endsWith('.sketch');
  });
  if (file) {
    fileRef.value = file;
  } else {
    alert('It it not a sketch file!');
  }
}
