import { MousePointerClick } from "lucide-react";

// An animated "tap here" affordance for the try-it-out CTA over live
// embeds: a cursor that periodically taps, with a ripple, to invite the
// visitor to interact. Purely decorative (pointer-events:none) and fades
// out once the button is hovered — see `.invite-cursor` in globals.css.
// Lives here so both the server Hero and the client ProjectsBrowser can
// share it; it has no hooks, so it renders in either context.
export function InviteCursor() {
  return (
    <span className="invite-cursor" aria-hidden>
      <span className="invite-cursor__ripple" />
      <MousePointerClick size={18} strokeWidth={2.25} />
    </span>
  );
}
