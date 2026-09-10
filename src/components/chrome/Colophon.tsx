// The foot of every route: an ornamented rule and the maker's mark,
// below the page's own content.
export function Colophon() {
  return (
    <footer className="colophon mx-auto max-w-5xl px-6 pt-24 pb-14">
      <div className="rule-ornament" aria-hidden>
        <span className="text-[0.6rem] tracking-[0.5em]">✦</span>
      </div>
      <p className="colophon-mark mt-8 text-center">
        Jacob Valdez · <span>{new Date().getFullYear()}</span>
      </p>
    </footer>
  );
}
