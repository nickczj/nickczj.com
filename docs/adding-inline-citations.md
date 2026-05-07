# Inline Citations

For a static blog with footnote-style citations that expand on hover, you have three viable patterns. I'll lay them out by complexity, then recommend.

## Option 1: Native markdown footnotes + CSS/JS hover

Nuxt Content already supports GitHub-flavored footnotes via `remark-gfm`. Authoring is the cleanest possible:

```md
VO₂max is the gold-standard measure of cardiorespiratory fitness[^astrand].
It scales with cardiac output and a-v O₂ difference[^fick1870].

[^astrand]: Åstrand, P-O. & Rodahl, K. (1986). *Textbook of Work Physiology*, 3rd ed., McGraw-Hill, pp. 295–353.
[^fick1870]: Fick, A. (1870). Über die Messung des Blutquantums in den Herzventrikeln. *Sitzungsberichte der Physikalisch-Medizinischen Gesellschaft zu Würzburg*.
```

The renderer outputs the footnote text into a `<section data-footnotes>` at the bottom of the page and the inline marker becomes `<a href="#user-content-fn-astrand">`. You then wire a small client plugin that, on mount, reads each footnote's text and clones it into a popover anchored to the inline marker.

Pros: zero authoring friction, fully accessible by default (the link still works without JS), survives static export. Cons: the popover is built imperatively in JS, not as a Vue component, so it's slightly awkward to style with your design system.

## Option 2: A `<Cite>` MDC component with a global bibliography

You define your sources once in `content/_sources.yml` (or a frontmatter map), reference them by key, and a Vue component handles the hover UI. This is what I'd recommend — it scales, keys are stable across posts, and you can render a proper "References" section at the bottom of each article from the same data.

```yaml
# content/_sources.yml
astrand1986:
  authors: Åstrand, P-O. & Rodahl, K.
  year: 1986
  title: Textbook of Work Physiology
  edition: 3rd ed.
  publisher: McGraw-Hill
  pages: 295–353

fick1870:
  authors: Fick, A.
  year: 1870
  title: Über die Messung des Blutquantums in den Herzventrikeln
  venue: Sitzungsberichte der Physikalisch-Medizinischen Gesellschaft zu Würzburg
```

Authoring:

```md
VO₂max is the gold-standard measure of cardiorespiratory fitness:cite[astrand1986].
The underlying principle dates to Fick:cite[fick1870].
```

The component:

```vue
<!-- components/content/Cite.vue -->
<script setup lang="ts">
import sources from '~/content/_sources.yml' // or fetch via queryCollection
const props = defineProps<{ id: string }>()

const source = computed(() => sources[props.id])
const number = computed(() => useCiteRegistry().register(props.id))
const formatted = computed(() => {
  const s = source.value
  if (!s) return `[unknown: ${props.id}]`
  const parts = [s.authors, `(${s.year})`, s.title]
  if (s.edition) parts.push(s.edition)
  if (s.venue) parts.push(s.venue)
  if (s.publisher) parts.push(s.publisher)
  if (s.pages) parts.push(`pp. ${s.pages}`)
  return parts.join('. ') + '.'
})
</script>

<template>
  
    :href="`#ref-${id}`"
    class="cite"
    :aria-describedby="`cite-pop-${id}`"
  >
    <sup>[{{ number }}]</sup>
    <span :id="`cite-pop-${id}`" role="tooltip" class="cite__pop">
      <span class="cite__pop-num">{{ number }}</span>
      <span class="cite__pop-body">{{ formatted }}</span>
    </span>
  </a>
</template>
```

The `useCiteRegistry()` composable assigns sequential numbers per page (so the first citation in the article is `[1]`, regardless of which key it uses) and tracks order for the References list. Roughly:

```ts
// composables/useCiteRegistry.ts
export const useCiteRegistry = () => {
  const order = useState<string[]>('cite-order', () => [])
  return {
    register(id: string) {
      if (!order.value.includes(id)) order.value.push(id)
      return order.value.indexOf(id) + 1
    },
    all: () => order.value,
  }
}
```

And a `<References />` component reads `useCiteRegistry().all()` and renders the ordered list at the bottom of the post.

## Option 3: Citation.js + CSL

For a finance/stats blog this is overkill, but worth knowing it exists: store sources as BibTeX or CSL-JSON, render with [Citation.js](https://citation.js.org/), get proper APA/Chicago/Vancouver formatting for free. Use this if you ever cite enough academic work that hand-formatting becomes a chore. Otherwise skip.

## The CSS

Same design tokens as before, hover popover anchored above the marker:

```css
/* Inline citation marker */
.cite {
  position: relative;
  display: inline;
  text-decoration: none;
  color: var(--math-accent);
  font-weight: 500;
  cursor: help;
}
.cite sup {
  font-size: 0.72em;
  padding: 0 0.1em;
  transition: color 0.15s ease;
}
.cite:hover sup,
.cite:focus-visible sup {
  color: var(--math-accent-strong, rgb(67 56 202));
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Popover — hidden by default */
.cite__pop {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  width: max-content;
  max-width: min(380px, calc(100vw - 2rem));
  padding: 0.75rem 0.9rem;
  background: var(--cite-pop-bg, rgb(24 24 27));
  color: var(--cite-pop-fg, rgb(244 244 245));
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  font-weight: 400;
  text-align: left;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.65rem;
  box-shadow: 0 4px 16px -4px rgb(0 0 0 / 0.25);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 50;
}

/* Tail */
.cite__pop::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--cite-pop-bg, rgb(24 24 27));
}

.cite__pop-num {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  color: var(--math-accent);
  padding-top: 0.05rem;
}
.cite__pop-body {
  font-family: ui-serif, Georgia, serif;
}

/* Show on hover/focus */
.cite:hover .cite__pop,
.cite:focus-visible .cite__pop,
.cite__pop:hover {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
  transition-delay: 0.1s; /* avoid flicker on quick mouseover */
}

/* Edge-of-screen handling — flip below if there's no room above */
@supports (anchor-name: --x) {
  .cite__pop {
    position-try-fallbacks: flip-block;
  }
}

/* Mobile: no hover, tap-to-toggle (handled by JS adding .is-open) */
@media (hover: none) {
  .cite__pop { display: none; }
  .cite.is-open .cite__pop {
    display: grid;
    opacity: 1;
    pointer-events: auto;
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    transform: none;
    max-width: none;
  }
  .cite.is-open .cite__pop::after { display: none; }
}

/* Dark mode inversion — popover stays dark in light mode for contrast,
   but in dark mode lighten it so it doesn't disappear into the page */
.dark .cite__pop {
  --cite-pop-bg: rgb(244 244 245);
  --cite-pop-fg: rgb(24 24 27);
}
```

## A few cross-cutting notes

**Mobile.** Hover doesn't exist on touch — handle this by detecting `(hover: none)` and switching to a tap-to-toggle pattern with a bottom sheet (as in the CSS above). The user taps the marker, popover slides up from the bottom, tap outside to dismiss.

**Accessibility.** The marker should always be a real `<a href="#ref-...">` pointing at the References section. That way the popover is pure progressive enhancement; if JS fails or hover isn't available, the link still navigates to the full citation. Use `aria-describedby` on the link to associate the popover for screen readers.

**Don't forget the bottom-of-page list.** Hover popovers are great for "what's this source?" without breaking flow, but a proper article should still render a numbered References section at the end. The `useCiteRegistry` pattern above gives you that for free.

**One thing to avoid.** Don't use `title=""` attributes for the popover content. They render as native browser tooltips with no styling control, are inaccessible to keyboard users on most browsers, and have a delay you can't tune.

For your blog specifically — given you already have the `MathDef` component and a design system rolling — I'd go with **Option 2**. The MDC `:cite[id]` syntax matches the inline-component style you're already using, the YAML source-of-truth means you can grep/refactor citations, and the registry composable gives you free numbered references at the bottom without authors having to think about ordering.

----

# Inline Term Glosses

Good instinct to question this — and the answer is no, you shouldn't reuse the citation component, even though it'd be technically easy. The two patterns look similar but signal different things to the reader, and conflating them is the kind of thing that quietly erodes trust in your writing.

## Why they're different

A citation marker `[3]` carries a specific contract: "this claim is backed by an external source you can verify." When a reader hovers and sees a definition instead of a source, the contract breaks — they got something useful but not what was promised. Worse, the reverse happens too: once you've trained readers that `[n]` means "hover for context," they'll stop treating real citations as load-bearing evidence and just skim them as glossary entries.

The visual language also matters. Citations belong at the *end* of a clause (post-claim attribution); definitions belong on the *term itself* (mid-sentence gloss). Same hover mechanic, different anchor point, different reader expectation.

## The right pattern: inline term glosses

This is its own well-established convention — the dotted underline. It signals "there's more here if you want it, but the sentence works without it." Wikipedia uses it, MDN uses it, technical writing style guides (Microsoft, Google) all recommend it. The HTML primitive is `<dfn>`, which is exactly what it's for.

Authoring with an MDC component, parallel to your `:cite[]`:

```md
Endurance performance is shaped by three physiological levers beyond VO₂max:
:term[lactate threshold]{def="lactate-threshold"},
:term[movement economy]{def="economy"}, and
:term[muscle power]{def="power"}.
```

With definitions in `content/_glossary.yml`:

```yaml
lactate-threshold:
  short: The exercise intensity at which blood lactate begins to accumulate faster than it can be cleared — typically 75–85% of VO₂max in trained athletes.
economy:
  short: The oxygen cost of moving at a given submaximal pace. Two runners with identical VO₂max can differ by 20%+ in how much oxygen they need to hold 4 min/km.
power:
  short: The rate of force production, especially relevant for the final kick or hill surges. Distinct from strength — measured in watts, not kilograms.
```

The component:

```vue
<!-- components/content/Term.vue -->
<script setup lang="ts">
import glossary from '~/content/_glossary.yml'
const props = defineProps<{ def: string }>()
const entry = computed(() => glossary[props.def])
</script>

<template>
  <dfn class="term" :title="entry?.short">
    <slot />
    <span class="term__pop" role="tooltip">{{ entry?.short }}</span>
  </dfn>
</template>
```

Note the differences from `<Cite>`: it's a `<dfn>` element (semantically correct), there's no superscript marker, and the popover is keyed off the term itself.

## The visual distinction

The CSS deliberately diverges from citations:

```css
.term {
  font-style: normal; /* override <dfn>'s default italic */
  border-bottom: 1px dotted var(--color-text-tertiary);
  cursor: help;
  position: relative;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.term:hover {
  border-bottom-color: var(--math-accent);
  color: var(--math-accent);
}

.term__pop {
  /* same positioning logic as .cite__pop, but: */
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  border: 0.5px solid var(--color-border-secondary);
  font-family: inherit;        /* not serif */
  font-size: 0.8125rem;
  /* lighter, conversational — not a citation card */
}
```

So the reader sees:

- **Dotted underline + sans-serif popover** = "here's a quick gloss, keep reading"
- **Superscript [n] + dark popover with serif text** = "here's where I got this from"

Two different mechanics, two different reader contracts, no ambiguity.

## When the line genuinely blurs

The one case where it's tempting to overload citations is when a term needs *both* a gloss and a source — e.g., "lactate threshold (defined by Faude et al. 2009 as...)." Resist the urge to combine them. Use the term gloss for the definition and a separate citation for the source:

```md
:term[lactate threshold]{def="lt"} is sport-specific and individually
variable :cite[faude2009].
```

Reader gets a quick definition on hover of the term, *and* a verifiable source on hover of the marker. Both work without crowding either signal.

## A nudge on scope

The glossary file is going to be tempting to over-fill. Keep it to terms that (a) recur across multiple posts, or (b) need a one-line gloss to keep a sentence flowing. Anything that needs a paragraph belongs in a footnote, an aside box, or its own post — not a hover popover. The popover is a tooltip; if you find yourself writing a 60-word definition, the term has outgrown the format.
