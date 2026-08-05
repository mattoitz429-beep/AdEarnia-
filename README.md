# EarnFlow Pro

Build a mobile-first responsive web application named "AdEarn". 

AdEarn is a platform where users watch a 2-ad bundle (1 Monetag Ad + 1 Adsterra Ad) to earn ₦35.00 (or localized currency) and request payouts through progressive withdrawal tiers.



TECH STACK:

- Frontend: HTML5, CSS3 (Tailwind CSS), JavaScript (Vanilla JS or React)

- Backend & Auth: Supabase (Authentication, PostgreSQL, OTP Verification)

- Ad Networks: Monetag Direct Link & Adsterra Direct Link

- Payout Workflow: Admin Manual Transfers (Paystack for NGN, Paypal/Crypto for International)



---



### 1. CURRENCY & PROGRESSIVE WITHDRAWAL SYSTEM



#### A. Currency Localization

- Detect user country upon sign up (NGN ₦ by default).

- Supported Currencies & Reward per 2-Ad Bundle:

  - Nigeria (NGN): ₦35.00 per bundle

  - USA/Global (USD): $0.025 per bundle

  - Europe (EUR): €0.02 per bundle

  - UK (GBP): £0.02 per bundle



#### B. Progressive Withdrawal Tiers

Withdrawal thresholds automatically step up after every completed payout:

- Tier 1 (First Cashout): ₦500 / $1.00

- Tier 2 (Second Cashout): ₦1,000 / $2.00

- Tier 3 (Third Cashout): ₦2,000 / $4.00

- Tier 4 (Fourth Cashout): ₦3,000 / $6.00

- Tier 5+ (Subsequent): Increases by ₦1,000 / $2.00 per completed tier.



---



### 2. UI LAYOUT & NAVIGATION

Dark mode design system (`#0F172A` background, `#1E293B` card slate).



#### A. Sticky Header (Top)

- Left: "AdEarn" Logo with gold coin icon.

- Right: Live Account Balance Badge (e.g., "₦525.00").



#### B. Bottom Navigation Bar (Fixed Bottom)

- 🏠 Home (Default tab)

- 💸 Wallet (Withdrawal requests)

- 👤 Profile (User details & bank account setup)



---



### 3. TAB SPECIFICATIONS



#### Tab 1: Home Screen (2-Step Task Card)

- Welcome Banner: "Welcome back, [Name]!"

- Task Container: "Complete Both Steps to Earn ₦35.00"

  - Step 1 Button: "1. Watch Ad #1 (Monetag)" -> Opens Monetag Direct Link in new tab.

  - Step 2 Button: "2. Watch Ad #2 (Adsterra)" -> Opens Adsterra Direct Link in new tab.

- Claim Button: "Claim ₦35.00 Reward" (Disabled until both Step 1 and Step 2 are completed).

- Current Withdrawal Goal Card: "Next Goal: ₦500.00" with a progress bar.



#### Tab 2: Wallet Screen

- Available Balance Card.

- Current Tier Level Info (e.g., "Current Minimum Cashout: ₦500").

- Withdrawal Request Form:

  - Input field for Withdrawal Amount.

  - Display of selected Bank Account details.

  - "Request Payout" button (disabled if balance < current tier minimum).

- Transaction History Cards (Pending, Completed, Rejected).



#### Tab 3: Profile Screen

- User Profile Details & Supabase Email Verification status.

- Saved Bank Details Form (Bank Name, Account Number, Account Name).

- Legal Links: Terms of Service (Anti-Fraud Policy), Privacy Policy, Cookie Policy.



---



### 4. 2-STEP BUNDLE JAVASCRIPT ENGINE



```javascript

const MONETAG_URL = "[https://your-monetag-smartlink.com](https://your-monetag-smartlink.com)";

const ADSTERRA_URL = "[https://your-adsterra-directlink.com](https://your-adsterra-directlink.com)";



// Step Completion Tracking

let step1Done = false;

let step2Done = false;

let isCooldown = false;



const REWARD_RATES = { NGN: 35.00, USD: 0.025, EUR: 0.02, GBP: 0.02 };



function handleStep1() {

  window.open(MONETAG_URL, '_blank');

  step1Done = true;

  document.getElementById('step1-btn').innerText = "Step 1 Completed ✅";

  document.getElementById('step1-btn').classList.add('bg-gray-600');

  checkBundleCompletion();

}



function handleStep2() {

  window.open(ADSTERRA_URL, '_blank');

  step2Done = true;

  document.getElementById('step2-btn').innerText = "Step 2 Completed ✅";

  document.getElementById('step2-btn').classList.add('bg-gray-600');

  checkBundleCompletion();

}



function checkBundleCompletion() {

  const claimBtn = document.getElementById('claim-reward-btn');

  if (step1Done && step2Done) {

    claimBtn.disabled = false;

    claimBtn.classList.add('animate-pulse', 'bg-emerald-500');

  }

}



async function handleClaimReward(userCurrency = 'NGN') {

  if (!step1Done || !step2Done) return;

  if (isCooldown) {

    alert("Please wait for cooldown!");

    return;

  }



  const rewardAmount = REWARD_RATES[userCurrency] || 35.00;

  

  // Credit ₦35 to Supabase database

  await creditUserReward(rewardAmount);



  // Reset steps & trigger 15-second cooldown

  step1Done = false;

  step2Done = false;

  document.getElementById('step1-btn').innerText = "1. Watch Ad #1 (Monetag)";

  document.getElementById('step2-btn').innerText = "2. Watch Ad #2 (Adsterra)";

  document.getElementById('claim-reward-btn').disabled = true;



  startCooldown(15);

}



function startCooldown(seconds) {

  isCooldown = true;

  let remaining = seconds;

  const claimBtn = document.getElementById('claim-reward-btn');

  

  const interval = setInterval(() => {

    remaining--;

    claimBtn.innerText = `Cooldown (${remaining}s)...`;

    if (remaining <= 0) {

      clearInterval(interval);

      claimBtn.innerText = "Claim ₦35.00 Reward";

      isCooldown = false;

    }

  }, 1000);

}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://earny-bundle.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/17eca9d0-4f86-4cc6-914a-ba70f8873ed2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
