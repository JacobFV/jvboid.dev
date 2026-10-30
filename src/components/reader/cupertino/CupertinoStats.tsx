/**
 * A row of Apple-style figures: a big number, a short line under it. Pure
 * markup; the type and spacing live under the cupertino world in globals.css.
 */
export function CupertinoStats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="cup-stats">
      {items.map((it) => (
        <div key={it.value + it.label} className="cup-stat">
          <dt className="cup-stat__label">{it.label}</dt>
          <dd className="cup-stat__value">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
