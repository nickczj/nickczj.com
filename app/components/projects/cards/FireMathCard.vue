<script setup lang="ts">
import LatexBlock from '~/components/projects/LatexBlock.vue'
</script>

<template>
  <div class="math-card">
    <div class="math-formulas">
      <div class="math-row">
        <span class="math-label">CPF Bonus</span>
        <LatexBlock :expression="'I_{\\text{bonus}} = \\frac{\\min(B, 60000) \\times 0.01}{12}'" :display="true" />
      </div>
      <div class="math-row">
        <span class="math-label">FIRE Number</span>
        <LatexBlock :expression="'\\text{FIRE} = \\text{Expenses} \\times 25'" :display="true" />
      </div>
      <div class="math-row">
        <span class="math-label">T-Bill Yield</span>
        <LatexBlock :expression="'Y = \\frac{F - P}{P} \\times \\frac{365}{d}'" :display="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.math-card {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid var(--rule);
}

.math-formulas {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.math-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.math-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  flex-shrink: 0;
  min-width: 3.2rem;
}

.math-row :deep(.latex-display) {
  margin: 0;
  flex: 1;
  text-align: left;
  font-size: 0.75rem;
}

.math-row :deep(.katex) {
  font-size: 0.85em;
}
</style>
