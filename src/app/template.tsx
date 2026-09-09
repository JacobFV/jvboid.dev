// The page turn. A template re-mounts on every navigation, which is the
// one thing a layout will not do, and that re-mount is what restarts the
// entrance: the page fades up, and the title and standfirst arrive a beat
// after it. See `.page-turn` in globals.css. Reduced motion collapses the
// animation to nothing through the global rule.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-turn">{children}</div>;
}
