import Link from "next/link";

// The running head. A printed page carries the section on one side and
// the issue or date on the other in a small face above a rule, and that
// is all this is: mono, letterspaced, a hairline underneath. It sits at
// the top of every reading page and every index, above the title, so
// the reader knows where in the book they are before they know what
// the page says.
export function Folio({
  section,
  href,
  right,
  className,
}: {
  section: string;
  /** Where the section name goes when clicked; omit for a plain label. */
  href?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["folio", className].filter(Boolean).join(" ")}>
      <span>{href ? <Link href={href}>{section}</Link> : section}</span>
      {right != null && <span>{right}</span>}
    </div>
  );
}
