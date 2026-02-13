import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using GestorNiq ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>GestorNiq is a SaaS metrics platform that provides revenue tracking, valuation estimates, and financial analytics for startups. The Service offers a 3-day free trial followed by paid subscription plans.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Billing and Subscriptions</h2>
            <p>Paid plans are billed monthly via Stripe. You can cancel at any time through the customer portal. Cancellations take effect at the end of the current billing period. No refunds are provided for partial months.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data and Privacy</h2>
            <p>Your data remains yours. We access it only to provide the Service. See our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details on data handling.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Disclaimers</h2>
            <p>GestorNiq provides estimates and projections based on data you supply. These are not financial advice. Valuations are illustrative and should not be used as the sole basis for investment decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, GestorNiq shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:support@gestorniq.com" className="text-primary hover:underline">support@gestorniq.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
