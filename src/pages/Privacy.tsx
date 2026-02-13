import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide directly: name, email address, company name, and financial metrics you input. We also collect usage data such as pages visited and features used.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use your data to provide and improve the Service, process payments, send service-related communications, and generate your metrics dashboards.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Data Security</h2>
            <p>We follow security best practices including: encrypted data in transit (TLS), read-only access patterns where possible, and secure authentication. Your financial data is stored in isolated, access-controlled databases.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
            <p>We do not sell your data. We share data only with service providers necessary to operate the platform (e.g., Stripe for payments, cloud hosting providers).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion, we remove your data within 30 days, except where retention is required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href="mailto:support@gestorniq.com" className="text-primary hover:underline">support@gestorniq.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>For privacy-related inquiries, contact us at <a href="mailto:support@gestorniq.com" className="text-primary hover:underline">support@gestorniq.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
