import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  // Create Supabase client with service role key for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: err instanceof Error ? err.message : 'Unknown' });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription,
          metadata: session.metadata 
        });

        // Get user_id from metadata
        const userId = session.metadata?.user_id;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan || 'pro';

        if (!userId) {
          logStep("No user_id in metadata, trying to find by email");
          // Try to find user by email
          const customerEmail = session.customer_details?.email;
          if (customerEmail) {
            const { data: profiles } = await supabaseAdmin
              .from('profiles')
              .select('user_id')
              .eq('email', customerEmail)
              .single();
            
            if (profiles?.user_id) {
              await updateSubscription(supabaseAdmin, {
                userId: profiles.user_id,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                status: 'active',
                plan,
              });
            }
          }
        } else {
          await updateSubscription(supabaseAdmin, {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: 'active',
            plan,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          metadata: subscription.metadata 
        });

        const userId = subscription.metadata?.user_id;
        const plan = subscription.metadata?.plan || 'pro';

        // Map Stripe status to our status
        let status = subscription.status;
        if (status === 'active' || status === 'trialing') {
          status = subscription.status;
        } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
          status = 'cancelled';
        }

        if (userId) {
          await updateSubscription(supabaseAdmin, {
            userId,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            status,
            plan,
            currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        } else {
          // Try to find user by Stripe customer ID
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .single();

          if (existingSub?.user_id) {
            await updateSubscription(supabaseAdmin, {
              userId: existingSub.user_id,
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              status,
              plan,
              currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        // Find and update subscription by stripe_subscription_id
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          logStep("Error updating cancelled subscription", { error: error.message });
        } else {
          logStep("Subscription marked as cancelled");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

interface SubscriptionUpdate {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  plan: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

async function updateSubscription(supabase: any, data: SubscriptionUpdate) {
  logStep("Updating subscription", data);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: data.stripeCustomerId,
      stripe_subscription_id: data.stripeSubscriptionId,
      status: data.status,
      plan: data.plan,
      current_period_start: data.currentPeriodStart || null,
      current_period_end: data.currentPeriodEnd || null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', data.userId);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
    throw error;
  }

  logStep("Subscription updated successfully");
}
