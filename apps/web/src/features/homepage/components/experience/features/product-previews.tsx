import { Bell, Check, Circle, Clock3, Mail, Sparkles } from "lucide-react";

export function PlanPreview() {
  return (
    <div className="feature-roadmap">
      <div className="feature-roadmap-heading">
        <span className="feature-widget-icon">
          <Sparkles aria-hidden="true" size={20} />
        </span>
        <div>
          <small>Product roadmap</small>
          <h3>A little more you.</h3>
        </div>
      </div>
      <div className="feature-roadmap-columns">
        <div>
          <span className="feature-column-label">
            <Circle aria-hidden="true" size={12} /> Next up
          </span>
          <article>
            <span className="marketing-status">Workspace</span>
            <h4>Personal dashboard</h4>
            <p>Your tools, your way.</p>
            <small>8 people asked for this</small>
          </article>
        </div>
        <div>
          <span className="feature-column-label">
            <Clock3 aria-hidden="true" size={12} /> In progress
          </span>
          <article className="feature-roadmap-highlight">
            <span className="marketing-status">Feature request</span>
            <h4>Saved views</h4>
            <p>Pick up where you left off.</p>
            <small>12 people asked for this</small>
            <span className="feature-roadmap-progress">
              <span />
            </span>
          </article>
        </div>
      </div>
      <p className="feature-preview-note">
        <span className="marketing-avatar">M</span> Maya and your team can
        follow along.
      </p>
    </div>
  );
}

export function ReleasePreview() {
  return (
    <div className="feature-release">
      <article className="feature-release-card">
        <div>
          <span className="marketing-status">
            <Check aria-hidden="true" size={12} /> Just shipped
          </span>
          <span>Product update</span>
        </div>
        <h3>Saved views are here.</h3>
        <p>Save your filters. Pick up where you left off.</p>
        <span className="feature-release-thanks">
          <span className="marketing-avatar">M</span> Thanks for the idea, Maya.
        </span>
      </article>
      <div className="feature-delivery">
        <span>
          <Mail aria-hidden="true" size={16} /> Voters notified
        </span>
        <Check aria-hidden="true" size={14} />
      </div>
      <div className="feature-delivery">
        <span>
          <Bell aria-hidden="true" size={16} /> Announced in your app
        </span>
        <Check aria-hidden="true" size={14} />
      </div>
    </div>
  );
}
