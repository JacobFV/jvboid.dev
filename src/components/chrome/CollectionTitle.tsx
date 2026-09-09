// Large display title for a collection page (e.g. /projects). Tagged
// with `data-page-title` so SiteHeader can fade in a matching breadcrumb
// crumb once this heading scrolls out of view.
export function CollectionTitle({ children }: { children: string }) {
  return (
    <header className="pt-14 pb-10">
      <h1 data-page-title className="display-title">
        {children}
      </h1>
    </header>
  );
}
