import Stripe from "stripe";

// Card payments (Stripe). Everything payment-related stays hidden until
// STRIPE_SECRET_KEY is set; a test key (sk_test_...) takes only test cards.
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return (client ??= new Stripe(key));
}

export function cardPaymentsEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;
}
