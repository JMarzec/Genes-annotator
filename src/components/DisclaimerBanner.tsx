import { AlertTriangle } from "lucide-react";

const DisclaimerBanner = () => (
  <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm">
    <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
    <span className="text-foreground">
      <strong>Research support tool</strong> — not for clinical decision-making. All outputs are hypotheses, not diagnoses.
    </span>
  </div>
);

export default DisclaimerBanner;
