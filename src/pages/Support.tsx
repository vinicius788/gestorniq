import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Support</h1>
        <p className="text-muted-foreground mb-8">We're here to help. Choose how you'd like to reach us.</p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <Mail className="h-8 w-8 text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Email Support</h2>
            <p className="text-sm text-muted-foreground mb-4">Send us an email and we'll respond within 24 hours.</p>
            <Button variant="outline" asChild>
              <a href="mailto:support@gestorniq.com">support@gestorniq.com</a>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <MessageCircle className="h-8 w-8 text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Feature Requests</h2>
            <p className="text-sm text-muted-foreground mb-4">Have an idea? Let us know what you'd like to see.</p>
            <Button variant="outline" asChild>
              <a href="mailto:feedback@gestorniq.com">Send Feedback</a>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 md:col-span-2">
            <FileText className="h-8 w-8 text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Documentation</h2>
            <p className="text-sm text-muted-foreground mb-4">Check our terms and privacy policy for detailed information.</p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/terms">Terms of Service</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
