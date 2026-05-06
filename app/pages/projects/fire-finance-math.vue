<script setup lang="ts">
import '~/assets/projects.css'
import { getProject } from '~/data/projects'
import StatusBadge from '~/components/projects/StatusBadge.vue'
import LatexBlock from '~/components/projects/LatexBlock.vue'

const project = getProject('fire-finance-math')

if (!project) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

useSeoMeta({
  title: 'FIRE Finance Math | nickczj.com',
  description: project.description
})
</script>

<template>
  <article class="page">
    <NuxtLink class="back-link" to="/projects">Back to projects</NuxtLink>

    <header class="page-header">
      <p class="eyebrow">Project</p>
      <h1>{{ project.title }}</h1>
      <div class="entry-meta">
        <StatusBadge :status="project.status" />
        <span v-if="project.techs.length" class="tag-list" aria-label="Tech stack">
          <span v-for="tech in project.techs" :key="tech" class="tag">{{ tech }}</span>
        </span>
      </div>
      <p class="lede">{{ project.description }}</p>
    </header>

    <img
      v-if="project.image"
      :src="project.image"
      :alt="project.title"
      class="project-hero"
    />

    <section class="prose">
      <h2>CPF Bonus Interest</h2>
      <p>
        CPF interest is computed monthly on the lowest balance for that month, with bonus
        interest on the first S$60,000 of combined balances (capped at S$20,000 for OA). The
        effective annual rate depends on how contributions are timed throughout the year.
      </p>

      <p>The monthly interest for Ordinary Account (OA) base rate:</p>
      <LatexBlock :expression="'I_{\\text{OA}} = B_{\\min} \\times \\frac{0.025}{12}'" :display="true" />

      <p>With bonus interest on the first S$60,000 (up to S$20,000 from OA):</p>
      <LatexBlock :expression="'I_{\\text{bonus}} = \\min(B_{\\text{OA}}, 20000) \\times \\frac{0.01}{12} + \\max(0, 60000 - B_{\\text{OA}}) \\times \\frac{0.01}{12}'" :display="true" />

      <h2>FIRE Number</h2>
      <p>
        The FIRE (Financial Independence, Retire Early) number estimates the portfolio size
        needed to sustainably withdraw living expenses. Based on the 4% rule (Trinity Study):
      </p>

      <LatexBlock :expression="'\\text{FIRE Number} = \\frac{\\text{Annual Expenses}}{0.04} = \\text{Annual Expenses} \\times 25'" :display="true" />

      <p>
        Singapore-specific adjustments include CPF Life payouts from age 65, which reduce
        the required portfolio drawdown rate. The bridge fund covers expenses from retirement
        age until CPF Life payouts begin:
      </p>

      <LatexBlock :expression="'B = Y \\times (65 - R) \\quad \\text{where } Y = \\text{annual expenses}, R = \\text{retirement age}'" :display="true" />

      <h2>SSB vs T-Bill</h2>
      <p>
        The Singapore Savings Bond (SSB) uses a step-up coupon structure where interest rates
        increase over the 10-year tenure. The effective yield is the average of all coupon rates.
        T-bills are sold at a discount with the yield determined by the cut-off price at auction:
      </p>

      <LatexBlock :expression="'\\text{Yield} = \\frac{\\text{Face Value} - \\text{Price}}{\\text{Price}} \\times \\frac{365}{\\text{Days to Maturity}}'" :display="true" />

      <p>
        The break-even analysis between SSB and T-bills depends on the holding period and
        interest rate expectations. SSB offers the option to redeem early without capital loss,
        while T-bills must be held to maturity or sold at market price.
      </p>
    </section>
  </article>
</template>
