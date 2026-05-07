<template>
  <figure class="math-def">
    <div class="math-def__main">
      <MDCSlot />
    </div>
    <div v-if="$slots.where" class="math-def__where">
      <span class="math-def__where-label">where</span>
      <div class="math-def__where-list">
        <MDCSlot name="where" />
      </div>
    </div>
  </figure>
</template>
