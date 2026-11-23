<script setup>
import SocialLinks from '../components/SocialLinks.vue'
</script>

<template>
    <div class="container foreground">
      <section class="profile">
        <h1>xie-bro<span>.</span></h1>
        <p>一般路过前端开发</p>
        <SocialLinks class="profile-links" />
      </section>
    </div>
</template>
<style scoped>
.foreground {align-self:stretch;color:#1e3540;display:flex;align-items:center;padding-block:32px 80px;pointer-events:none}
.profile {pointer-events:auto;width:clamp(280px,27vw,400px);padding:clamp(24px,2.6vw,42px);background-color:#edf3ee99;border:1px solid #ffffffa8;box-shadow:0 12px 44px #18354312;backdrop-filter:blur(9px);border-radius:6px}
.profile h1 {color:inherit;font:normal clamp(58px,5.8vw,96px)/1.05 Georgia,serif;letter-spacing:-.075em;margin:0 0 7px}
.profile h1 span {color:#8a6952}
.profile p {font-size:16px;letter-spacing:.1em;color:inherit;margin:0}
.profile-links {margin-top:26px;padding-top:20px;border-top:1px solid #43566338;justify-content:flex-end}
:global(body.dark .profile) {background:#203441ad;color:#eff4f1;border-color:#ffffff45}
@media (max-width:700px) {
  .foreground {align-items:flex-start;padding-block:28px}
  .profile {padding:18px 21px;width:225px}
  .profile h1 {font-size:54px;margin-bottom:2px}
  .profile p {font-size:14px}
  .profile-links {padding-top:12px;margin-top:15px}
}
</style>
